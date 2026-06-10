import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Search } from "lucide-react";

import type { SortOrder } from "../../../types";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "../../ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { LoadingSpinnerState } from "../LoadingSpinnerState";

export interface DataTableRenderContext {
  rowIndex: number;
  absoluteIndex: number;
}

export interface DataTableColumn<TItem, TSort extends string = string> {
  id: string;
  label: ReactNode;
  widthClassName?: string;
  headerClassName?: string;
  cellClassName?: string;
  sortField?: TSort;
  group?: "info" | "score" | "status" | "meta" | string;
  startsGroup?: boolean;
  render: (item: TItem, context: DataTableRenderContext) => ReactNode;
}

export interface DataTableSearchConfig {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export interface DataTableSelectFilter {
  type?: "select";
  id: string;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}

export interface DataTableToggleFilter {
  type?: "toggle";
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface DataTableCustomFilter {
  type: "custom";
  id: string;
  render: () => ReactNode;
}

export type DataTableFilter =
  | DataTableSelectFilter
  | DataTableToggleFilter
  | DataTableCustomFilter;

export interface DataTableSortOption<TSort extends string = string> {
  label: string;
  value: TSort;
}

export interface DataTableSortConfig<TSort extends string = string> {
  options: Array<DataTableSortOption<TSort>>;
  sortBy: TSort;
  onSortByChange: (value: TSort) => void;
  sortOrder: SortOrder;
  onToggleSortOrder: () => void;
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  pageNumbers: number[];
  onPageChange: (page: number) => void;
}

export interface DataTableProps<TItem, TSort extends string = string> {
  items: TItem[];
  getRowId: (item: TItem) => string | number;
  columns: Array<DataTableColumn<TItem, TSort>>;
  loading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  noDataAction?: ReactNode;
  search?: DataTableSearchConfig;
  filters?: DataTableFilter[];
  sort?: DataTableSortConfig<TSort>;
  pagination?: DataTablePagination;
  itemLabelSingular?: string;
  itemLabelPlural?: string;
  onOpenRow?: (item: TItem) => void;
  rowAriaLabel?: (item: TItem) => string;
  className?: string;
  contentClassName?: string;
  tableClassName?: string;
  carded?: boolean;
}

export function DataTable<TItem, TSort extends string = string>({
  items,
  getRowId,
  columns,
  loading = false,
  loadingMessage,
  error = null,
  emptyTitle = "No data",
  emptyDescription = "No rows match the current filters.",
  noDataAction,
  search,
  filters = [],
  sort,
  pagination,
  itemLabelSingular = "item",
  itemLabelPlural = "items",
  onOpenRow,
  rowAriaLabel,
  className,
  contentClassName,
  tableClassName,
  carded = true,
}: DataTableProps<TItem, TSort>) {
  const hasControls = Boolean(search) || filters.length > 0 || Boolean(sort);
  const firstScoreColumnId =
    columns.find((column) => column.group === "score" || column.startsGroup)?.id ?? null;
  const selectFilters = filters.filter(
    (filter): filter is DataTableSelectFilter => "options" in filter
  );
  const toggleFilters = filters.filter(
    (filter): filter is DataTableToggleFilter =>
      !("options" in filter) && filter.type !== "custom"
  );
  const customFilters = filters.filter(
    (filter): filter is DataTableCustomFilter => filter.type === "custom"
  );

  const content = (
    <CardContent className={cn("flex flex-col gap-4 p-4", contentClassName)}>
      {hasControls ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          {search ? (
            <form
              className="flex min-w-[16rem] max-w-[700px] flex-1 flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                search.onSubmit();
              }}
            >
              <label className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <Search className="h-4 w-4" />
                <input
                  value={search.value}
                  onChange={(event) => search.onChange(event.target.value)}
                  placeholder={search.placeholder ?? "Search"}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </label>
              <Button type="submit" variant="outline" size="sm">
                Apply
              </Button>
            </form>
          ) : (
            <div />
          )}

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {selectFilters.map((filter) => {
              const selectedLabel =
                filter.options.find((option) => option.value === filter.value)?.label ??
                filter.value;
              return (
                <DropdownMenu key={filter.id}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-w-[9.5rem] justify-between bg-white text-slate-700"
                    >
                      <span className="font-normal text-slate-500">{filter.label}:</span>
                      <span>{selectedLabel}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[12rem]">
                    <DropdownMenuLabel>{filter.label}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={filter.value}
                      onValueChange={filter.onChange}
                    >
                      {filter.options.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}

            {sort ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-w-[11rem] justify-between bg-white text-slate-700"
                    aria-label={`Sort by: ${
                      sort.options.find((option) => option.value === sort.sortBy)?.label ??
                      sort.sortBy
                    }`}
                  >
                    <span className="font-normal text-slate-500">Sort by</span>
                    <span>
                      {sort.options.find((option) => option.value === sort.sortBy)?.label ??
                        sort.sortBy}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[12rem]">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={sort.sortBy}
                    onValueChange={(value) => sort.onSortByChange(value as TSort)}
                  >
                    {sort.options.map((option) => (
                      <DropdownMenuRadioItem key={option.value} value={option.value}>
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {sort ? (
              <Button variant="outline" size="sm" onClick={sort.onToggleSortOrder}>
                {sort.sortOrder === "asc" ? (
                  <>
                    <ArrowUp className="h-4 w-4" />
                    Asc
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-4 w-4" />
                    Desc
                  </>
                )}
              </Button>
            ) : null}

            {toggleFilters.map((filter) => (
              <label
                key={filter.id}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={filter.checked}
                  onChange={(event) => filter.onChange(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                {filter.label}
              </label>
            ))}

            {customFilters.map((filter) => (
              <div key={filter.id}>{filter.render()}</div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <LoadingSpinnerState
            message={loadingMessage ?? `Loading ${itemLabelPlural}`}
            className="min-h-[16rem]"
          />
        ) : error ? (
          <div className="flex min-h-[16rem] items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          noDataAction ? (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">
              <p className="text-sm text-slate-600">{emptyDescription}</p>
              {noDataAction}
            </div>
          ) : (
            <Empty className="min-h-[16rem]">
              <EmptyHeader>
                <EmptyTitle>{emptyTitle}</EmptyTitle>
                <EmptyDescription>{emptyDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        ) : (
          <Table className={cn("table-fixed min-w-[980px]", tableClassName)}>
            <colgroup>
              {columns.map((column) => (
                <col key={column.id} className={column.widthClassName} />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow>
                {columns.map((column) => {
                  const startsScoreGroup = column.id === firstScoreColumnId;
                  return (
                    <TableHead
                      key={column.id}
                      className={cn(
                        "whitespace-nowrap px-5 text-[11px] uppercase tracking-[0.16em] text-slate-500",
                        startsScoreGroup ? "border-l border-slate-200 pl-5" : "",
                        column.headerClassName
                      )}
                    >
                      {column.label}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, rowIndex) => {
                const absoluteIndex = pagination
                  ? (pagination.page - 1) * pagination.pageSize + rowIndex
                  : rowIndex;
                return (
                  <TableRow
                    key={getRowId(item)}
                    role={onOpenRow ? "button" : undefined}
                    tabIndex={onOpenRow ? 0 : undefined}
                    aria-label={rowAriaLabel?.(item)}
                    className={cn(
                      "h-[4.25rem] border-b border-slate-200 hover:bg-slate-50/80",
                      onOpenRow ? "cursor-pointer" : ""
                    )}
                    onClick={() => onOpenRow?.(item)}
                    onKeyDown={(event) => {
                      if (!onOpenRow) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenRow(item);
                      }
                    }}
                  >
                    {columns.map((column) => {
                      const startsScoreGroup = column.id === firstScoreColumnId;
                      return (
                        <TableCell
                          key={column.id}
                          className={cn(
                            "px-5 py-4",
                            startsScoreGroup ? "border-l border-slate-200 pl-5" : "",
                            column.cellClassName
                          )}
                        >
                          {column.render(item, { rowIndex, absoluteIndex })}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {pagination && pagination.total > 0 ? (
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing{" "}
            {`${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(
              pagination.page * pagination.pageSize,
              pagination.total
            )}`}{" "}
            of {pagination.total.toLocaleString()}{" "}
            {pagination.total === 1 ? itemLabelSingular : itemLabelPlural}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  size="default"
                  onClick={(event) => {
                    event.preventDefault();
                    pagination.onPageChange(pagination.page - 1);
                  }}
                  className={pagination.page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {pagination.pageNumbers.map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    size="default"
                    isActive={pageNumber === pagination.page}
                    onClick={(event) => {
                      event.preventDefault();
                      pagination.onPageChange(pageNumber);
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  size="default"
                  onClick={(event) => {
                    event.preventDefault();
                    pagination.onPageChange(pagination.page + 1);
                  }}
                  className={
                    pagination.page >=
                    Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </CardContent>
  );

  return carded ? (
    <Card className={cn("flex-1 overflow-hidden", className)}>{content}</Card>
  ) : (
    <div className={cn("flex-1 overflow-hidden", className)}>{content}</div>
  );
}
