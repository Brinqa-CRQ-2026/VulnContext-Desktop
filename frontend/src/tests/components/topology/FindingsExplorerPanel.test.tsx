import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FindingsExplorerPanel } from "../../../components/topology/shared/FindingsExplorerPanel";
import { buildFinding } from "../../fixtures/findings/findings";

const defaultProps = {
  searchDraft: "",
  onSearchDraftChange: vi.fn(),
  onApplySearch: vi.fn(),
  bandFilter: "All" as const,
  onBandFilterChange: vi.fn(),
  sortBy: "risk_score" as const,
  onSortByChange: vi.fn(),
  sortOrder: "desc" as const,
  onToggleSortOrder: vi.fn(),
  kevOnly: false,
  onKevOnlyChange: vi.fn(),
  sourceFilter: "All",
  onSourceFilterChange: vi.fn(),
  sources: ["Nessus", "CrowdStrike"],
  showSourceFilter: true,
  findings: [
    buildFinding({
      id: "finding-1",
      title: "OpenSSL vulnerability",
      cve_id: "CVE-2026-0001",
      source: "Nessus",
      risk_band: "High",
      isKev: true,
    }),
  ],
  onOpenFinding: vi.fn(),
  total: 11,
  page: 1,
  totalPages: 2,
  pageNumbers: [1, 2],
  onPageChange: vi.fn(),
};

describe("FindingsExplorerPanel", () => {
  it("renders findings, source filters, sort controls, and pagination", () => {
    render(<FindingsExplorerPanel {...defaultProps} />);

    expect(screen.getByText("CVE-2026-0001")).toBeInTheDocument();
    expect(screen.getAllByText("KEV").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /Source: All/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sort by: Display risk/i })).toBeInTheDocument();
    expect(screen.getByText("Showing 1-6 of 11 findings")).toBeInTheDocument();
  });

  it("wires search, risk, KEV, source, sort, pagination, and row callbacks", async () => {
    const user = userEvent.setup();
    const props = {
      ...defaultProps,
      onSearchDraftChange: vi.fn(),
      onApplySearch: vi.fn(),
      onBandFilterChange: vi.fn(),
      onKevOnlyChange: vi.fn(),
      onSourceFilterChange: vi.fn(),
      onSortByChange: vi.fn(),
      onToggleSortOrder: vi.fn(),
      onPageChange: vi.fn(),
      onOpenFinding: vi.fn(),
    };

    render(<FindingsExplorerPanel {...props} />);

    fireEvent.change(screen.getByPlaceholderText("Search finding or CVE"), {
      target: { value: "openssl" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Search finding or CVE").closest("form")!);
    await user.click(screen.getByRole("button", { name: /Risk band: All/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Critical" }));
    await user.click(screen.getByLabelText("KEV only"));
    await user.click(screen.getByRole("button", { name: /Source: All/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "CrowdStrike" }));
    await user.click(screen.getByRole("button", { name: /Sort by: Display risk/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Source" }));
    await user.click(screen.getByRole("button", { name: "Desc" }));
    await user.click(screen.getByRole("link", { name: "2" }));
    await user.click(screen.getByRole("button", { name: "Open CVE-2026-0001" }));

    expect(props.onSearchDraftChange).toHaveBeenCalledWith("openssl");
    expect(props.onApplySearch).toHaveBeenCalled();
    expect(props.onBandFilterChange).toHaveBeenCalledWith("Critical");
    expect(props.onKevOnlyChange).toHaveBeenCalledWith(true);
    expect(props.onSourceFilterChange).toHaveBeenCalledWith("CrowdStrike");
    expect(props.onSortByChange).toHaveBeenCalledWith("source");
    expect(props.onToggleSortOrder).toHaveBeenCalled();
    expect(props.onPageChange).toHaveBeenCalledWith(2);
    expect(props.onOpenFinding).toHaveBeenCalledWith(props.findings[0]);
  });

  it("hides source-specific controls when source filtering is disabled", () => {
    render(<FindingsExplorerPanel {...defaultProps} showSourceFilter={false} />);

    expect(screen.queryByRole("button", { name: /Source: All/i })).not.toBeInTheDocument();
  });

  it("renders the empty state for filtered results", () => {
    render(<FindingsExplorerPanel {...defaultProps} findings={[]} total={0} totalPages={1} />);

    expect(screen.getByText("No findings")).toBeInTheDocument();
    expect(screen.getByText("No findings match the current filters.")).toBeInTheDocument();
  });
});
