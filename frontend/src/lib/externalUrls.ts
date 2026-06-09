import { requestOpenExternalUrl } from "../runtime/desktopBridge";

export function isExternalUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      return parsed.origin !== window.location.origin;
    }

    return true;
  } catch {
    return false;
  }
}

export async function openExternalUrl(url: string) {
  if (!isExternalUrl(url)) {
    return false;
  }

  await requestOpenExternalUrl(url);
  return true;
}
