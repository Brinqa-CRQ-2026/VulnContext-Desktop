import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  DataTable,
  type DataTableColumn,
} from "../../../../components/shared/data-table/DataTable";
import { buildTableRows } from "../../../fixtures/tables/tableRows";

interface DemoRow {
  id: string;
  name: string;
  score: number;
  status: string;
}

const rows: DemoRow[] = [
  { id: "row-1", name: "Identity API", score: 8.5, status: "Active" },
];

const columns: Array<DataTableColumn<DemoRow, "name" | "score">> = [
  {
    id: "name",
    label: "Name",
    render: (row) => row.name,
  },
  {
    id: "score",
    label: "Score",
    group: "score",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (row) => row.score.toFixed(1),
  },
];

describe("DataTable", () => {
  it("renders arbitrary rows and applies configured columns", () => {
    render(
      <DataTable
        items={rows}
        getRowId={(row) => row.id}
        columns={columns}
      />
    );

    const headers = within(screen.getByRole("table")).getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual(["Name", "Score"]);
    expect(screen.getByText("Identity API")).toBeInTheDocument();
    expect(screen.getByText("8.5")).toBeInTheDocument();
    expect(headers[1]).toHaveClass("border-l");
  });

  it("supports search, select filters, toggles, sort controls, pagination, and row open", async () => {
    const onSearchChange = vi.fn();
    const onSearchSubmit = vi.fn();
    const onFilterChange = vi.fn();
    const onToggleFilter = vi.fn();
    const onSortByChange = vi.fn();
    const onToggleSortOrder = vi.fn();
    const onPageChange = vi.fn();
    const onOpenRow = vi.fn();
    const user = userEvent.setup();

    render(
      <DataTable<DemoRow, "name" | "score">
        items={rows}
        getRowId={(row) => row.id}
        columns={columns}
        search={{
          value: "",
          placeholder: "Search rows",
          onChange: onSearchChange,
          onSubmit: onSearchSubmit,
        }}
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
          {
            id: "flagged",
            label: "Flagged",
            checked: false,
            onChange: onToggleFilter,
          },
        ]}
        sort={{
          options: [
            { label: "Name", value: "name" },
            { label: "Score", value: "score" },
          ],
          sortBy: "name",
          onSortByChange,
          sortOrder: "desc",
          onToggleSortOrder,
        }}
        pagination={{
          page: 1,
          pageSize: 1,
          total: 2,
          pageNumbers: [1, 2],
          onPageChange,
        }}
        itemLabelSingular="row"
        itemLabelPlural="rows"
        onOpenRow={onOpenRow}
        rowAriaLabel={(row) => `Open ${row.name}`}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Search rows"), {
      target: { value: "api" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Search rows").closest("form")!);
    await user.click(screen.getByRole("button", { name: /Status: All/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Active" }));
    await user.click(screen.getByLabelText("Flagged"));
    await user.click(screen.getByRole("button", { name: /Sort by: Name/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Score" }));
    await user.click(screen.getByRole("button", { name: "Desc" }));
    await user.click(screen.getByRole("link", { name: "2" }));
    await user.click(screen.getByRole("button", { name: "Open Identity API" }));

    expect(onSearchChange).toHaveBeenCalledWith("api");
    expect(onSearchSubmit).toHaveBeenCalled();
    expect(onFilterChange).toHaveBeenCalledWith("Active");
    expect(onToggleFilter).toHaveBeenCalledWith(true);
    expect(onSortByChange).toHaveBeenCalledWith("score");
    expect(onToggleSortOrder).toHaveBeenCalled();
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(onOpenRow).toHaveBeenCalledWith(rows[0]);
    expect(screen.getByText("Showing 1-1 of 2 rows")).toBeInTheDocument();
  });

  it("renders loading, error, and empty states", () => {
    const { rerender } = render(
      <DataTable items={[]} getRowId={(row: DemoRow) => row.id} columns={columns} loading />
    );
    expect(screen.getByText("Loading items")).toBeInTheDocument();

    rerender(
      <DataTable
        items={[]}
        getRowId={(row: DemoRow) => row.id}
        columns={columns}
        error="Failed"
      />
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();

    rerender(
      <DataTable
        items={[]}
        getRowId={(row: DemoRow) => row.id}
        columns={columns}
        emptyTitle="Nothing here"
        emptyDescription="No rows available."
      />
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("No rows available.")).toBeInTheDocument();
  });

  it("renders dense data with stable absolute row context", () => {
    const denseRows = buildTableRows(25);

    render(
      <DataTable
        items={denseRows}
        getRowId={(row) => row.id}
        columns={[
          {
            id: "position",
            label: "Position",
            render: (_row, context) => `#${context.absoluteIndex + 1}`,
          },
          {
            id: "name",
            label: "Name",
            render: (row) => row.name,
          },
        ]}
        pagination={{
          page: 3,
          pageSize: 10,
          total: 25,
          pageNumbers: [1, 2, 3],
          onPageChange: vi.fn(),
        }}
      />
    );

    expect(screen.getByText("#21")).toBeInTheDocument();
    expect(screen.getByText("#45")).toBeInTheDocument();
    expect(screen.getByText("Row 25")).toBeInTheDocument();
    expect(screen.getByText("Showing 21-25 of 25 items")).toBeInTheDocument();
  });

  it("marks pagination boundaries as unavailable", () => {
    const { rerender } = render(
      <DataTable
        items={rows}
        getRowId={(row) => row.id}
        columns={columns}
        pagination={{
          page: 1,
          pageSize: 10,
          total: 15,
          pageNumbers: [1, 2],
          onPageChange: vi.fn(),
        }}
      />
    );

    expect(screen.getByRole("link", { name: "Go to previous page" })).toHaveClass(
      "pointer-events-none"
    );
    expect(screen.getByRole("link", { name: "Go to next page" })).not.toHaveClass(
      "pointer-events-none"
    );

    rerender(
      <DataTable
        items={rows}
        getRowId={(row) => row.id}
        columns={columns}
        pagination={{
          page: 2,
          pageSize: 10,
          total: 15,
          pageNumbers: [1, 2],
          onPageChange: vi.fn(),
        }}
      />
    );

    expect(screen.getByRole("link", { name: "Go to previous page" })).not.toHaveClass(
      "pointer-events-none"
    );
    expect(screen.getByRole("link", { name: "Go to next page" })).toHaveClass(
      "pointer-events-none"
    );
  });

  it("does not expose row button behavior when no row action is configured", () => {
    render(
      <DataTable items={rows} getRowId={(row) => row.id} columns={columns} />
    );

    expect(screen.queryByRole("button", { name: "Open Identity API" })).not.toBeInTheDocument();
    expect(screen.getByText("Identity API")).toBeInTheDocument();
  });
});
