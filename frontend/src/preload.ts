import { contextBridge, ipcRenderer } from "electron";
import { DESKTOP_SHUTDOWN_CHANNEL } from "./runtime/desktopBridge";

const api = {
  shutdown() {
    return ipcRenderer.invoke(DESKTOP_SHUTDOWN_CHANNEL);
  },
};

contextBridge.exposeInMainWorld("vulnContextDesktop", api);
