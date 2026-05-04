import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "path";
import {
  buildDashboardLogoutScript,
  buildDashboardStorageScript,
  buildStorageSnapshotScript,
  describeToken,
  parseStoredAuthState,
} from "./src/auth/brinqaAuth";
import type { StoredAuthState } from "./src/auth/brinqaAuth";
import {
  BRINQA_RESET_SESSION_CHANNEL,
  type BrinqaResetRequest,
} from "./src/auth/brinqaDesktopBridge";
import { performBrinqaRemoteLogout } from "./src/auth/brinqaRemoteLogout";

const isDev = process.env.NODE_ENV === "development";
const devServerUrl = process.env.ELECTRON_RENDERER_URL?.trim() || "http://127.0.0.1:5173";
const loginUrl = "https://ucsc.brinqa.net/auth/login";
const brinqaOrigin = new URL(loginUrl).origin;
const mfaUrlPrefix = "https://ucsc.brinqa.net/api/auth/mfa";
const mfaUrlPattern = "https://ucsc.brinqa.net/api/auth/mfa*";
const preloadPath = path.join(__dirname, "src", "preload.js");

let mainWindow: BrowserWindow | null = null;
let loginWindow: BrowserWindow | null = null;
let hasCompletedMfa = false;
let hasRegisteredMfaCompletionListener = false;
let pendingSessionReset: Promise<void> | null = null;
let hasRunQuitCleanup = false;
let skipBeforeQuitCleanup = false;
let allowLoginWindowClose = false;
let allowMainWindowClose = false;
let isAppShuttingDown = false;

function buildWindowWebPreferences() {
  return {
    contextIsolation: true,
    nodeIntegration: false,
    preload: preloadPath,
  };
}

function decodeResponseBody(body: string, base64Encoded: boolean) {
  if (!base64Encoded) {
    return body;
  }

  return Buffer.from(body, "base64").toString("utf8");
}

async function persistMfaDataToDashboard(mfaResponseBody: string) {
  if (!mainWindow || mainWindow.isDestroyed() || !mfaResponseBody) {
    return;
  }

  await mainWindow.webContents.executeJavaScript(buildDashboardStorageScript(mfaResponseBody));

  const snapshot = await mainWindow.webContents.executeJavaScript(buildStorageSnapshotScript());
  console.log(`[Brinqa MFA] Dashboard localStorage updated: ${String(snapshot)}`);
}

async function clearStoredAuthState(window: BrowserWindow) {
  if (window.isDestroyed()) {
    return;
  }

  await window.webContents.executeJavaScript(buildDashboardLogoutScript());
  const snapshot = await window.webContents.executeJavaScript(buildStorageSnapshotScript());
  console.log(`[Brinqa Startup] Cleared stored auth state: ${String(snapshot)}`);
}

async function withDashboardWindow<T>(
  action: (window: BrowserWindow) => Promise<T>
): Promise<T> {
  const existingWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  if (existingWindow) {
    return action(existingWindow);
  }

  const bootstrapWindow = new BrowserWindow({
    show: false,
    webPreferences: buildWindowWebPreferences(),
  });

  try {
    loadDashboardUrl(bootstrapWindow, false);
    await new Promise<void>((resolve) => {
      bootstrapWindow.webContents.once("did-finish-load", () => resolve());
    });
    return await action(bootstrapWindow);
  } finally {
    if (!bootstrapWindow.isDestroyed()) {
      bootstrapWindow.destroy();
    }
  }
}

async function readStoredAuthState(): Promise<StoredAuthState> {
  return withDashboardWindow(async (window) =>
    parseStoredAuthState(
      await window.webContents.executeJavaScript(buildStorageSnapshotScript())
    )
  );
}

async function clearStoredAuthStateEverywhere() {
  await withDashboardWindow(async (window) => {
    await clearStoredAuthState(window);
  });
}

async function readValidatedAuthState(): Promise<StoredAuthState> {
  const authState = await readStoredAuthState();
  const tokenInfo = describeToken(authState.authToken);

  console.log(
    `[Brinqa Startup] Token inspection: ${JSON.stringify({
      format: tokenInfo.format,
      expiresAt:
        typeof tokenInfo.expiresAt === "number"
          ? new Date(tokenInfo.expiresAt).toISOString()
          : null,
      expired: tokenInfo.expired,
    })}`
  );

  if (tokenInfo.expired) {
    await clearStoredAuthStateEverywhere();
    return { mfaResponse: null, authToken: null };
  }

  return authState;
}

async function readBrinqaSessionCookie() {
  const cookies = await session.defaultSession.cookies.get({
    url: brinqaOrigin,
    name: "JSESSIONID",
  });
  return cookies[0]?.value ?? null;
}

async function clearBrinqaSessionData() {
  const cookies = await session.defaultSession.cookies.get({ url: brinqaOrigin });
  await Promise.all(
    cookies.flatMap((cookie) => {
      if (!cookie.domain) {
        return [];
      }

      const protocol = cookie.secure ? "https" : "http";
      const domain = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
      const pathName = cookie.path || "/";
      return [
        session.defaultSession.cookies.remove(
          `${protocol}://${domain}${pathName}`,
          cookie.name
        ),
      ];
    })
  );

  await session.defaultSession.clearStorageData({ origin: brinqaOrigin });
}

function ensureLoginWindow({ fresh = false }: { fresh?: boolean } = {}) {
  hasCompletedMfa = false;

  if (fresh && loginWindow && !loginWindow.isDestroyed()) {
    allowLoginWindowClose = true;
    loginWindow.destroy();
    loginWindow = null;
    allowLoginWindowClose = false;
  }

  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.show();
    loginWindow.focus();
    return;
  }

  createLoginWindow();
}

async function attemptRemoteBrinqaLogout() {
  const [{ authToken }, sessionCookie] = await Promise.all([
    readStoredAuthState(),
    readBrinqaSessionCookie(),
  ]);

  if (!authToken || !sessionCookie) {
    console.log("[Brinqa Logout] Skipping remote logout; token or JSESSIONID missing");
    return;
  }

  await performBrinqaRemoteLogout({
    baseUrl: brinqaOrigin,
    bearerToken: authToken,
    sessionCookie,
  });
}

async function doResetBrinqaSession({
  reopenLogin = false,
  includeRemoteLogout = true,
  quitApp = false,
  reason,
}: BrinqaResetRequest) {
  console.log(
    `[Brinqa Session] Reset requested: ${JSON.stringify({
      reason,
      reopenLogin,
      includeRemoteLogout,
      quitApp,
    })}`
  );

  if (includeRemoteLogout) {
    try {
      await attemptRemoteBrinqaLogout();
    } catch (error) {
      console.error("[Brinqa Logout] Remote logout failed:", error);
    }
  }

  await clearStoredAuthStateEverywhere();
  await clearBrinqaSessionData();
  hasCompletedMfa = false;

  if (reopenLogin) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      allowMainWindowClose = true;
      mainWindow.destroy();
      mainWindow = null;
      allowMainWindowClose = false;
    }
    ensureLoginWindow({ fresh: true });
  }
}

function resetBrinqaSession(request: BrinqaResetRequest) {
  if (!pendingSessionReset) {
    pendingSessionReset = doResetBrinqaSession(request).finally(() => {
      pendingSessionReset = null;
    });
    return pendingSessionReset;
  }

  return pendingSessionReset;
}

function loadDashboardUrl(window: BrowserWindow, openDevTools = false) {
  if (isDev) {
    window.loadURL(devServerUrl);
    if (openDevTools) {
      window.webContents.openDevTools();
    }
    return;
  }

  const indexPath = path.join(__dirname, "index.html");
  window.loadFile(indexPath);
}

function requestAppShutdown() {
  isAppShuttingDown = true;
  skipBeforeQuitCleanup = false;
  app.quit();
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
    allowLoginWindowClose = true;
    loginWindow.close();
    allowLoginWindowClose = false;
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
    webPreferences: buildWindowWebPreferences(),
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

  loginWindow.on("close", (event) => {
    if (allowLoginWindowClose || isAppShuttingDown) {
      return;
    }

    event.preventDefault();
    requestAppShutdown();
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
    webPreferences: buildWindowWebPreferences(),
  });

  loadDashboardUrl(mainWindow, true);

  mainWindow.webContents.once("did-finish-load", () => {
    if (mfaResponseBody) {
      void persistMfaDataToDashboard(mfaResponseBody);
    }

    mainWindow?.show();
  });

  mainWindow.on("close", (event) => {
    if (allowMainWindowClose || isAppShuttingDown) {
      return;
    }

    event.preventDefault();
    requestAppShutdown();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerMfaCompletionListener();
  ipcMain.handle(BRINQA_RESET_SESSION_CHANNEL, async (_event, request: BrinqaResetRequest) => {
    await resetBrinqaSession(request);
    if (request.quitApp) {
      isAppShuttingDown = true;
      skipBeforeQuitCleanup = true;
      allowLoginWindowClose = true;
      allowMainWindowClose = true;
      app.quit();
    }
  });

  void (async () => {
    const storedAuthState = await readValidatedAuthState();

    if (storedAuthState.authToken) {
      hasCompletedMfa = true;
      console.log("[Brinqa Startup] Existing auth token found, opening dashboard directly");
      createWindow(storedAuthState.mfaResponse ?? "");
      return;
    }

    console.log("[Brinqa Startup] No saved auth token found, opening login window");
    createLoginWindow();
  })();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length > 0) {
      return;
    }

    void (async () => {
      const storedAuthState = await readValidatedAuthState();
      if (storedAuthState.authToken) {
        hasCompletedMfa = true;
        createWindow(storedAuthState.mfaResponse ?? "");
        return;
      }

      hasCompletedMfa = false;
      createLoginWindow();
    })();
  });
});

app.on("before-quit", (event) => {
  if (skipBeforeQuitCleanup || hasRunQuitCleanup) {
    return;
  }

  isAppShuttingDown = true;
  hasRunQuitCleanup = true;
  event.preventDefault();

  void resetBrinqaSession({
    reason: "shutdown",
    reopenLogin: false,
    includeRemoteLogout: true,
    quitApp: false,
  }).finally(() => {
    skipBeforeQuitCleanup = true;
    allowLoginWindowClose = true;
    allowMainWindowClose = true;
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
