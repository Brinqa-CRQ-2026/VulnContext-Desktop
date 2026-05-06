import { contextBridge, ipcRenderer } from "electron";

const BRINQA_RESET_SESSION_CHANNEL = "brinqa-auth:reset-session";

type BrinqaResetRequest = {
  reason: "logout" | "unauthorized" | "shutdown";
  reopenLogin?: boolean;
  includeRemoteLogout?: boolean;
  quitApp?: boolean;
};

interface BrinqaDesktopAuthApi {
  resetSession(request: BrinqaResetRequest): Promise<void>;
}

const api: BrinqaDesktopAuthApi = {
  resetSession(request: BrinqaResetRequest) {
    return ipcRenderer.invoke(BRINQA_RESET_SESSION_CHANNEL, request);
  },
};

contextBridge.exposeInMainWorld("brinqaDesktopAuth", api);
