import { afterEach, describe, expect, it, vi } from "vitest";

import {
  requestDesktopShutdown,
  requestOpenExternalUrl,
} from "../../runtime/desktopBridge";
import {
  installMockElectronBridge,
  removeMockElectronBridge,
} from "../mocks/electronBridge";

describe("desktop bridge runtime wrapper", () => {
  afterEach(() => {
    removeMockElectronBridge();
    vi.restoreAllMocks();
  });

  it("uses the preload bridge for desktop shutdown when available", async () => {
    const bridge = installMockElectronBridge();
    const closeSpy = vi.spyOn(window, "close").mockImplementation(() => undefined);

    await requestDesktopShutdown();

    expect(bridge.shutdown).toHaveBeenCalledOnce();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("falls back to window.close when the preload bridge is missing", async () => {
    const closeSpy = vi.spyOn(window, "close").mockImplementation(() => undefined);

    await requestDesktopShutdown();

    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it("uses the preload bridge to open external URLs when available", async () => {
    const bridge = installMockElectronBridge();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    await requestOpenExternalUrl("https://example.com/advisory");

    expect(bridge.openExternalUrl).toHaveBeenCalledWith("https://example.com/advisory");
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("falls back to a noopener browser tab without the preload bridge", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    await requestOpenExternalUrl("https://example.com/advisory");

    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/advisory",
      "_blank",
      "noopener,noreferrer"
    );
  });
});
