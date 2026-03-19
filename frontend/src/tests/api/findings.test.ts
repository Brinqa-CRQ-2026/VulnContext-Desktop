import { beforeEach, describe, expect, it, vi } from "vitest";

function getFetchMock() {
  return global.fetch as unknown as ReturnType<typeof vi.fn>;
}

async function loadFindingsApi() {
  vi.resetModules();
  return import("../../api/findings");
}

describe("api/findings", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    getFetchMock().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
  });

  it("calls GET /findings/top", async () => {
    const { getTopScores } = await loadFindingsApi();
    await getTopScores();
    expect(getFetchMock()).toHaveBeenCalledWith("https://api.example.com/findings/top");
  });

  it("calls GET /findings/summary", async () => {
    const { getScoresSummary } = await loadFindingsApi();
    await getScoresSummary();
    expect(getFetchMock()).toHaveBeenCalledWith("https://api.example.com/findings/summary");
  });

  it("sends paging, sort, and source params for getAllFindings", async () => {
    const { getAllFindings } = await loadFindingsApi();
    await getAllFindings(2, 25, "cvss_score", "asc", "  Qualys  ");

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/findings?page=2&page_size=25&sort_by=cvss_score&sort_order=asc&source=Qualys"
    );
  });

  it("omits source when it is empty for getAllFindings", async () => {
    const { getAllFindings } = await loadFindingsApi();
    await getAllFindings(1, 20, "risk_score", "desc", "   ");

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/findings?page=1&page_size=20&sort_by=risk_score&sort_order=desc"
    );
  });

  it("includes the risk band and optional source for filtered findings", async () => {
    const { getFindingsByRiskBand } = await loadFindingsApi();
    await getFindingsByRiskBand("High", 3, 10, "age_in_days", "asc", "Nessus");

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/findings?page=3&page_size=10&sort_by=age_in_days&sort_order=asc&risk_band=High&source=Nessus"
    );
  });

  it("calls GET /findings/{id}", async () => {
    const { getFindingById } = await loadFindingsApi();
    await getFindingById(42);
    expect(getFetchMock()).toHaveBeenCalledWith("https://api.example.com/findings/42");
  });

  it("posts disposition updates as JSON", async () => {
    const { setFindingDisposition } = await loadFindingsApi();
    await setFindingDisposition(7, {
      disposition: "false_positive",
      reason: "dup",
      comment: "ignore",
      actor: "ui",
    });

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/findings/7/disposition",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disposition: "false_positive",
          reason: "dup",
          comment: "ignore",
          actor: "ui",
        }),
      })
    );
  });

  it("posts clear disposition without actor when omitted", async () => {
    const { clearFindingDisposition } = await loadFindingsApi();
    await clearFindingDisposition(9);

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/findings/9/disposition/clear",
      { method: "POST" }
    );
  });

  it("includes the actor query param for clear disposition when provided", async () => {
    const { clearFindingDisposition } = await loadFindingsApi();
    await clearFindingDisposition(9, " analyst ");

    expect(getFetchMock()).toHaveBeenCalledWith(
      "https://api.example.com/findings/9/disposition/clear?actor=analyst",
      { method: "POST" }
    );
  });

  it("surfaces backend errors", async () => {
    const { getTopScores } = await loadFindingsApi();
    getFetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "nope" }), { status: 500 })
    );

    await expect(getTopScores()).rejects.toThrow("nope");
  });
});
