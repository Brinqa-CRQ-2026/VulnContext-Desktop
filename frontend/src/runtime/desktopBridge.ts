export const DESKTOP_SHUTDOWN_CHANNEL = "vulncontext:shutdown";
export const OPEN_EXTERNAL_URL_CHANNEL = "vulncontext:open-external-url";

export interface VulnContextDesktopApi {
  shutdown(): Promise<void>;
  openExternalUrl(url: string): Promise<void>;
}

declare global {
  interface Window {
    vulnContextDesktop?: VulnContextDesktopApi;
  }
}

export async function requestDesktopShutdown() {
  if (typeof window === "undefined" || !window.vulnContextDesktop) {
    window.close();
    return;
  }

  await window.vulnContextDesktop.shutdown();
}

export async function requestOpenExternalUrl(url: string) {
  if (typeof window === "undefined" || !window.vulnContextDesktop) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  await window.vulnContextDesktop.openExternalUrl(url);
}
