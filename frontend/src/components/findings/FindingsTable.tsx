import type { ReactNode } from "react";
import type { ScoredFinding } from "../../types";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
  type DataTablePagination,
  type DataTableRenderContext,
  type DataTableSortOption,
} from "../shared/data-table/DataTable";

export type FindingsTableRenderContext = DataTableRenderContext;
export type FindingsTableColumn<TSort extends string = string> = DataTableColumn<
  ScoredFinding,
  TSort
>;
export type FindingsTableFilter = DataTableFilter;
export type FindingsTableSortOption<TSort extends string = string> =
  DataTableSortOption<TSort>;
export type FindingsTablePagination = DataTablePagination;

interface FindingsTableProps<TSort extends string = string> {
  findings: ScoredFinding[];
  columns: Array<FindingsTableColumn<TSort>>;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  filters?: FindingsTableFilter[];
  sortOptions?: Array<FindingsTableSortOption<TSort>>;
  sortBy?: TSort;
  onSortByChange?: (value: TSort) => void;
  sortOrder?: "asc" | "desc";
  onToggleSortOrder?: () => void;
  pagination?: FindingsTablePagination;
  onOpenFinding?: (finding: ScoredFinding) => void;
  rowAriaLabel?: (finding: ScoredFinding) => string;
  className?: string;
  tableClassName?: string;
  noDataAction?: ReactNode;
}

export function FindingsTable<TSort extends string = string>({
  findings,
  columns,
  loading,
  error,
  emptyTitle = "No findings",
  emptyDescription = "No findings match the current filters.",
  searchValue,
  searchPlaceholder = "Search findings",
  onSearchChange,
  onSearchSubmit,
  filters,
  sortOptions,
  sortBy,
  onSortByChange,
  sortOrder = "desc",
  onToggleSortOrder,
  pagination,
  onOpenFinding,
  rowAriaLabel,
  className,
  tableClassName,
  noDataAction,
}: FindingsTableProps<TSort>) {
  return (
    <DataTable<ScoredFinding, TSort>
      items={findings}
      getRowId={(finding) => finding.id}
      columns={columns}
      loading={loading}
      loadingMessage="Loading findings"
      error={error}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      search={
        searchValue !== undefined && onSearchChange && onSearchSubmit
          ? {
              value: searchValue,
              placeholder: searchPlaceholder,
              onChange: onSearchChange,
              onSubmit: onSearchSubmit,
            }
          : undefined
      }
      filters={filters}
      sort={
        sortOptions && sortBy && onSortByChange && onToggleSortOrder
          ? {
              options: sortOptions,
              sortBy,
              onSortByChange,
              sortOrder,
              onToggleSortOrder,
            }
          : undefined
      }
      pagination={pagination}
      itemLabelSingular="finding"
      itemLabelPlural="findings"
      onOpenRow={onOpenFinding}
      rowAriaLabel={rowAriaLabel}
      className={className}
      tableClassName={tableClassName}
      noDataAction={noDataAction}
    />
  );
}
