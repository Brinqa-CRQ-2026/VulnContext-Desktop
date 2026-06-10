import { beforeEach, describe, expect, it, vi } from "vitest";

function getFetchMock() {
  return global.fetch as unknown as ReturnType<typeof vi.fn>;
}

async function loadControlsApi() {
  vi.resetModules();
  return import("../../api/controls");
}

describe("api/controls", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    getFetchMock().mockResolvedValue(
      new Response(JSON.stringify({ id: "assessment-1", answers: {} }))
    );
  });

  it("builds the current control assessment request", async () => {
    const { getCurrentControlAssessment } = await loadControlsApi();

    await getCurrentControlAssessment();

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/controls/current"
    );
  });

  it("saves control answers with a PUT JSON body", async () => {
    const { saveCurrentControlAssessment } = await loadControlsApi();
    const answers = { prevent: { patch: 4 }, detect: { logging: 3 } };

    await saveCurrentControlAssessment(answers);

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/controls/current",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      }
    );
  });

  it("surfaces backend error details", async () => {
    getFetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "save failed" }), {
        status: 500,
        statusText: "Server Error",
      })
    );
    const { saveCurrentControlAssessment } = await loadControlsApi();

    await expect(saveCurrentControlAssessment({ prevent: { patch: 1 } })).rejects.toThrow(
      "save failed"
    );
  });
});
