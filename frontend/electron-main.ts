import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { DESKTOP_SHUTDOWN_CHANNEL } from "./src/runtime/desktopBridge";

const isDev = process.env.NODE_ENV === "development";
const preloadPath = path.join(__dirname, "src", "preload.js");

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: buildWindowWebPreferences(),
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
