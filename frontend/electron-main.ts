import { app, BrowserWindow, session } from "electron";
import path from "path";

const isDev = process.env.NODE_ENV === "development";
const loginUrl = "https://ucsc.brinqa.net/auth/login";
const mfaUrlPrefix = "https://ucsc.brinqa.net/api/auth/mfa";
const mfaUrlPattern = "https://ucsc.brinqa.net/api/auth/mfa*";
const mfaResponseStorageKey = "brinqaMfaResponse";
const brinqaTokenStorageKey = "brinqaAuthToken";

let mainWindow: BrowserWindow | null = null;
let loginWindow: BrowserWindow | null = null;
let hasCompletedMfa = false;
let hasRegisteredMfaCompletionListener = false;

function decodeResponseBody(body: string, base64Encoded: boolean) {
  if (!base64Encoded) {
    return body;
  }

  return Buffer.from(body, "base64").toString("utf8");
}

function tryParseJson(body: string) {
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractTokenValue(payload: Record<string, unknown> | null) {
  if (!payload) {
    return null;
  }

  const candidateKeys = ["token", "access_token", "accessToken", "id_token", "idToken"];

  for (const key of candidateKeys) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function buildStorageSnapshotScript() {
  return `
    JSON.stringify({
      mfaResponse: window.localStorage.getItem(${JSON.stringify(mfaResponseStorageKey)}),
      authToken: window.localStorage.getItem(${JSON.stringify(brinqaTokenStorageKey)})
    });
  `;
}

function buildDashboardStorageScript(mfaResponseBody: string) {
  const parsedPayload = tryParseJson(mfaResponseBody);
  const extractedToken = extractTokenValue(parsedPayload);

  return `
    window.localStorage.setItem(${JSON.stringify(mfaResponseStorageKey)}, ${JSON.stringify(mfaResponseBody)});
    ${
      extractedToken
        ? `window.localStorage.setItem(${JSON.stringify(brinqaTokenStorageKey)}, ${JSON.stringify(extractedToken)});`
        : ""
    }
  `;
}

async function persistMfaDataToDashboard(mfaResponseBody: string) {
  if (!mainWindow || mainWindow.isDestroyed() || !mfaResponseBody) {
    return;
  }

  await mainWindow.webContents.executeJavaScript(buildDashboardStorageScript(mfaResponseBody));

  const snapshot = await mainWindow.webContents.executeJavaScript(buildStorageSnapshotScript());
  console.log(`[Brinqa MFA] Dashboard localStorage updated: ${String(snapshot)}`);
}

function transitionToDashboard(mfaResponseBody = "") {
  if (hasCompletedMfa) {
    if (mfaResponseBody && mainWindow && !mainWindow.isDestroyed()) {
      void persistMfaDataToDashboard(mfaResponseBody);
    }
    return;
  }

  hasCompletedMfa = true;
  console.log("[Brinqa MFA] Transitioning to dashboard");

  if (!mainWindow) {
    createWindow(mfaResponseBody);
  } else {
    if (mfaResponseBody) {
      void persistMfaDataToDashboard(mfaResponseBody);
    }
    mainWindow.show();
    mainWindow.focus();
  }

  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close();
  }
}

function registerMfaCompletionListener() {
  if (hasRegisteredMfaCompletionListener) {
    return;
  }

  hasRegisteredMfaCompletionListener = true;

  session.defaultSession.webRequest.onCompleted(
    {
      urls: [mfaUrlPattern],
    },
    (details) => {
      console.log(
        `[Brinqa MFA] Request completed: ${details.method} ${details.url} status=${details.statusCode}`
      );

      if (details.statusCode < 200 || details.statusCode >= 400) {
        return;
      }

      transitionToDashboard();
    }
  );

  session.defaultSession.webRequest.onBeforeRequest(
    {
      urls: [mfaUrlPattern],
    },
    (details, callback) => {
      console.log(`[Brinqa MFA] Request started: ${details.method} ${details.url}`);
      callback({});
    }
  );

  session.defaultSession.webRequest.onErrorOccurred(
    {
      urls: [mfaUrlPattern],
    },
    (details) => {
      console.log(
        `[Brinqa MFA] Request failed: ${details.method} ${details.url} error=${details.error}`
      );
    }
  );
}

function attachMfaResponseListener(window: BrowserWindow) {
  const { debugger: webDebugger } = window.webContents;

  if (webDebugger.isAttached()) {
    return;
  }

  try {
    webDebugger.attach("1.3");
  } catch (error) {
    console.error("Failed to attach debugger to login window:", error);
    return;
  }

  webDebugger.sendCommand("Network.enable").catch((error) => {
    console.error("Failed to enable network tracking for login window:", error);
  });

  webDebugger.on("message", async (_event, method, params) => {
    if (method !== "Network.responseReceived") {
      return;
    }

    const responseUrl = typeof params.response?.url === "string" ? params.response.url : "";
    if (!responseUrl.startsWith(mfaUrlPrefix)) {
      return;
    }

    console.log(
      `[Brinqa MFA] Debugger saw response: ${responseUrl} status=${String(params.response?.status ?? "")}`
    );

    try {
      const response = (await webDebugger.sendCommand("Network.getResponseBody", {
        requestId: params.requestId,
      })) as { body: string; base64Encoded: boolean };

      console.log("[Brinqa MFA] Response body captured");
      const decodedBody = decodeResponseBody(response.body, response.base64Encoded);
      transitionToDashboard(decodedBody);
    } catch (error) {
      console.error("Failed to capture MFA response body:", error);
    }
  });

  window.on("closed", () => {
    if (webDebugger.isAttached()) {
      try {
        webDebugger.detach();
      } catch (error) {
        console.error("Failed to detach debugger from login window:", error);
      }
    }
  });
}

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    title: "Brinqa Login",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  attachMfaResponseListener(loginWindow);
  loginWindow.loadURL(loginUrl);

  loginWindow.webContents.on("did-navigate", (_event, url) => {
    console.log(`[Brinqa Login] Navigated to: ${url}`);
  });

  loginWindow.webContents.on("did-redirect-navigation", (_event, url, isInPlace, isMainFrame) => {
    console.log(
      `[Brinqa Login] Redirected to: ${url} inPlace=${String(isInPlace)} mainFrame=${String(isMainFrame)}`
    );
  });

  loginWindow.on("closed", () => {
    loginWindow = null;
  });
}

function createWindow(mfaResponseBody?: string) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, "index.html");
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.once("did-finish-load", () => {
    if (mfaResponseBody) {
      void persistMfaDataToDashboard(mfaResponseBody);
    }

    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerMfaCompletionListener();
  createLoginWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createLoginWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
