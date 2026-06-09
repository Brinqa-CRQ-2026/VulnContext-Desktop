import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import {
  DESKTOP_SHUTDOWN_CHANNEL,
  OPEN_EXTERNAL_URL_CHANNEL,
} from "./src/runtime/desktopBridge";

const isDev = process.env.NODE_ENV === "development";
const preloadPath = path.join(__dirname, "src", "preload.js");
const devAppUrl = "http://localhost:5173";

let mainWindow: BrowserWindow | null = null;
let allowWindowClose = false;

function buildWindowWebPreferences() {
  return {
    contextIsolation: true,
    nodeIntegration: false,
    preload: preloadPath,
  };
}

function loadDashboardUrl(window: BrowserWindow) {
  if (isDev) {
    window.loadURL("http://localhost:5173");
    return;
  }

  const indexPath = path.join(__dirname, "index.html");
  window.loadFile(indexPath);
}

function isExternalHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    if (isDev) {
      return parsed.origin !== new URL(devAppUrl).origin;
    }

    return true;
  } catch {
    return false;
  }
}

function handleExternalNavigation(url: string) {
  if (!isExternalHttpUrl(url)) {
    return false;
  }

  shell.openExternal(url);
  return true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: buildWindowWebPreferences(),
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return handleExternalNavigation(url) ? { action: "deny" } : { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (handleExternalNavigation(url)) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.on("did-create-window", (childWindow) => {
    childWindow.removeMenu();
  });

  loadDashboardUrl(mainWindow);

  mainWindow.on("close", (event) => {
    if (allowWindowClose) {
      return;
    }

    event.preventDefault();
    allowWindowClose = true;
    app.quit();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ipcMain.handle(DESKTOP_SHUTDOWN_CHANNEL, () => {
    allowWindowClose = true;
    app.quit();
  });

  ipcMain.handle(OPEN_EXTERNAL_URL_CHANNEL, (_event, url: string) => {
    return handleExternalNavigation(url);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
