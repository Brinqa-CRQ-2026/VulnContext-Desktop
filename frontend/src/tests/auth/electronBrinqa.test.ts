import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadModule() {
  vi.resetModules();
  return import("../../auth/electronBrinqa");
}

describe("electronBrinqa", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.brinqaDesktopAuth;
  });

  it("dedupes unauthorized resets after local auth is cleared", async () => {
    window.localStorage.setItem("brinqaAuthToken", "token-123");
    window.localStorage.setItem("brinqaMfaResponse", "{\"token\":\"token-123\"}");

    const resetSession = vi.fn().mockResolvedValue(undefined);
    window.brinqaDesktopAuth = {
      resetSession,
      isUiOnlyMode: () => false,
      setUiOnlyMode: vi.fn().mockResolvedValue(false),
    };

    const { requestBrinqaSessionReset } = await loadModule();

    await requestBrinqaSessionReset({
      reason: "unauthorized",
      reopenLogin: true,
      includeRemoteLogout: true,
    });

    await requestBrinqaSessionReset({
      reason: "unauthorized",
      reopenLogin: true,
      includeRemoteLogout: true,
    });

    expect(resetSession).toHaveBeenCalledTimes(1);
  });

  it("clears renderer auth after a successful logout reset", async () => {
    window.localStorage.setItem("brinqaAuthToken", "token-123");
    window.localStorage.setItem("brinqaMfaResponse", "{\"token\":\"token-123\"}");

    const resetSession = vi.fn().mockResolvedValue(undefined);
    window.brinqaDesktopAuth = {
      resetSession,
      isUiOnlyMode: () => false,
      setUiOnlyMode: vi.fn().mockResolvedValue(false),
    };

    const { requestBrinqaSessionReset } = await loadModule();

    await requestBrinqaSessionReset({
      reason: "logout",
      reopenLogin: true,
      includeRemoteLogout: true,
    });

    expect(window.localStorage.getItem("brinqaAuthToken")).toBeNull();
    expect(window.localStorage.getItem("brinqaMfaResponse")).toBeNull();
  });
});
