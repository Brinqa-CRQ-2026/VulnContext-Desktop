import { contextBridge, ipcRenderer } from "electron";
import { DESKTOP_SHUTDOWN_CHANNEL, OPEN_EXTERNAL_URL_CHANNEL } from "./runtime/desktopBridge";

const api = {
  shutdown() {
    return ipcRenderer.invoke(DESKTOP_SHUTDOWN_CHANNEL);
  },
  openExternalUrl(url: string) {
    return ipcRenderer.invoke(OPEN_EXTERNAL_URL_CHANNEL, url);
  },
};

contextBridge.exposeInMainWorld("vulnContextDesktop", api);
