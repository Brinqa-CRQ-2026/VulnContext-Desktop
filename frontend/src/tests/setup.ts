import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll, vi } from "vitest";

const fetchMock = vi.fn();

beforeAll(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  fetchMock.mockReset();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
