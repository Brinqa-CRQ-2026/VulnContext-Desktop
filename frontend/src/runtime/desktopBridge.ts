export const DESKTOP_SHUTDOWN_CHANNEL = "vulncontext:shutdown";

export interface VulnContextDesktopApi {
  shutdown(): Promise<void>;
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
