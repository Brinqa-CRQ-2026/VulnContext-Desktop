import { vi } from "vitest";
import type { VulnContextDesktopApi } from "../../runtime/desktopBridge";

export function installMockElectronBridge(
  overrides: Partial<VulnContextDesktopApi> = {}
) {
  const bridge: VulnContextDesktopApi = {
    shutdown: vi.fn().mockResolvedValue(undefined),
    openExternalUrl: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  window.vulnContextDesktop = bridge;
  return bridge;
}

export function removeMockElectronBridge() {
  delete window.vulnContextDesktop;
}
