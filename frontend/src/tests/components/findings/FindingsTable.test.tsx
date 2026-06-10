import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  FindingsTable,
  type FindingsTableColumn,
} from "../../../components/findings/FindingsTable";
import type { ScoredFinding } from "../../../types";

const findings: ScoredFinding[] = [
  {
    id: "finding-1",
    source: "Brinqa",
    asset_id: "asset-1",
    display_name: "OpenSSL Vulnerability",
    business_service: "Digital Storefront",
    risk_score: 8.6,
  },
];

const columns: FindingsTableColumn[] = [
  {
    id: "finding",
    label: "Finding",
    render: (finding) => finding.display_name,
  },
  {
    id: "service",
    label: "Service",
    render: (finding) => finding.business_service,
  },
];

describe("FindingsTable", () => {
  it("renders only the configured columns in the configured order", () => {
    render(<FindingsTable findings={findings} columns={columns} />);

    const headers = within(screen.getByRole("table")).getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual(["Finding", "Service"]);
    expect(screen.getByText("OpenSSL Vulnerability")).toBeInTheDocument();
    expect(screen.getByText("Digital Storefront")).toBeInTheDocument();
  });

  it("calls search, filter, sort, direction, and row click handlers", async () => {
    const onSearchChange = vi.fn();
    const onSearchSubmit = vi.fn();
    const onFilterChange = vi.fn();
    const onSortByChange = vi.fn();
    const onToggleSortOrder = vi.fn();
    const onOpenFinding = vi.fn();
    const user = userEvent.setup();

    render(
      <FindingsTable
        findings={findings}
        columns={columns}
        searchValue=""
        searchPlaceholder="Search findings"
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        filters={[
          {
            id: "status",
            label: "Status",
            value: "All",
            options: [
              { label: "All", value: "All" },
              { label: "Active", value: "Active" },
            ],
            onChange: onFilterChange,
          },
        ]}
        sortOptions={[
          { label: "Risk Score", value: "risk_score" },
          { label: "Source", value: "source" },
        ]}
        sortBy="risk_score"
        onSortByChange={onSortByChange}
        sortOrder="desc"
        onToggleSortOrder={onToggleSortOrder}
        onOpenFinding={onOpenFinding}
        rowAriaLabel={(finding) => `Open ${finding.display_name}`}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Search findings"), {
      target: { value: "openssl" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Search findings").closest("form")!);
    await user.click(screen.getByRole("button", { name: /Status: All/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Active" }));
    await user.click(screen.getByRole("button", { name: /Sort by: Risk Score/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Source" }));
    await user.click(screen.getByRole("button", { name: "Desc" }));
    await user.click(screen.getByRole("button", { name: "Open OpenSSL Vulnerability" }));

    expect(onSearchChange).toHaveBeenCalledWith("openssl");
    expect(onSearchSubmit).toHaveBeenCalled();
    expect(onFilterChange).toHaveBeenCalledWith("Active");
    expect(onSortByChange).toHaveBeenCalledWith("source");
    expect(onToggleSortOrder).toHaveBeenCalled();
    expect(onOpenFinding).toHaveBeenCalledWith(findings[0]);
  });

  it("renders loading, error, and empty states", () => {
    const { rerender } = render(
      <FindingsTable findings={[]} columns={columns} loading />
    );
    expect(screen.getByText("Loading findings")).toBeInTheDocument();

    rerender(<FindingsTable findings={[]} columns={columns} error="Failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();

    rerender(
      <FindingsTable
        findings={[]}
        columns={columns}
        emptyTitle="Nothing here"
        emptyDescription="No scoped findings."
      />
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("No scoped findings.")).toBeInTheDocument();
  });
});
