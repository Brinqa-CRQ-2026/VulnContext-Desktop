import { contextBridge, ipcRenderer } from "electron";

import {
  BRINQA_GET_UI_ONLY_MODE_CHANNEL,
  BRINQA_RESET_SESSION_CHANNEL,
  BRINQA_SET_UI_ONLY_MODE_CHANNEL,
} from "./auth/brinqaDesktopBridge";

type BrinqaResetRequest = {
  reason: "logout" | "unauthorized" | "shutdown";
  reopenLogin?: boolean;
  includeRemoteLogout?: boolean;
  quitApp?: boolean;
};

interface BrinqaDesktopAuthApi {
  resetSession(request: BrinqaResetRequest): Promise<void>;
  isUiOnlyMode(): boolean;
  setUiOnlyMode(enabled: boolean): Promise<boolean>;
}

const api: BrinqaDesktopAuthApi = {
  resetSession(request: BrinqaResetRequest) {
    return ipcRenderer.invoke(BRINQA_RESET_SESSION_CHANNEL, request);
  },
  isUiOnlyMode() {
    return Boolean(ipcRenderer.sendSync(BRINQA_GET_UI_ONLY_MODE_CHANNEL));
  },
  setUiOnlyMode(enabled: boolean) {
    return ipcRenderer.invoke(BRINQA_SET_UI_ONLY_MODE_CHANNEL, enabled) as Promise<boolean>;
  },
};

contextBridge.exposeInMainWorld("brinqaDesktopAuth", api);
