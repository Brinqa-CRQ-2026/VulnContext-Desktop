import { ArrowDown, ArrowUp, Search } from "lucide-react";

import { useAssetInventoryState } from "../../hooks/topology/assets/useAssetInventoryState";
import type { AssetListSortBy, AssetSummary } from "../../types";
import { AssetDistributionCharts } from "./AssetDistributionCharts";
import { AssetsDrillDownTable } from "./DrillDownTables";
import { Button } from "../ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "../ui/empty";

export function AssetInventoryPanel({
  businessUnit,
  businessService,
  application,
  directOnly = false,
  refreshToken,
  onOpenAsset,
}: {
  businessUnit?: string | null;
  businessService?: string | null;
  application?: string | null;
  directOnly?: boolean;
  refreshToken: number;
  onOpenAsset: (asset: AssetSummary) => void;
}) {
  const {
    searchDraft,
    setSearchDraft,
    applySearch,
    status,
    setStatus,
    environment,
    setEnvironment,
    compliance,
    setCompliance,
    sortBy,
    setSortBy,
    sortOrder,
    toggleSortOrder,
    sortState,
    data,
    assets,
    loading,
    error,
    analytics,
    analyticsLoading,
    analyticsError,
    page,
    pageSize,
    totalPages,
    pageNumbers,
    goToPage,
    statusOptions,
    environmentOptions,
    complianceOptions,
  } = useAssetInventoryState({
    businessUnit,
    businessService,
    application,
    directOnly,
    refreshToken,
  });

  return (
    <div className="space-y-4">
      <AssetDistributionCharts
        analytics={analytics}
        loading={analyticsLoading}
        error={analyticsError}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <Search className="h-4 w-4" />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search asset or ID"
              className="min-w-[12rem] bg-transparent outline-none"
            />
          </label>
          <Button type="submit" variant="outline" size="sm">
            Apply
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="bg-transparent outline-none"
            >
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <span>Environment</span>
            <select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
              className="bg-transparent outline-none"
            >
              {environmentOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <span>Compliance</span>
            <select
              value={compliance}
              onChange={(event) => setCompliance(event.target.value)}
              className="bg-transparent outline-none"
            >
              {complianceOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <span>Sort by</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as AssetListSortBy)}
              className="bg-transparent outline-none"
            >
              <option value="finding_count">Findings</option>
              <option value="name">Asset / hostname</option>
              <option value="asset_type">Asset type</option>
              <option value="asset_criticality">Criticality</option>
              <option value="status">Status</option>
            </select>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortOrder}
          >
            {sortOrder === "asc" ? (
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
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
          Loading assets...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : assets.length === 0 ? (
        <Empty className="min-h-[12rem]">
          <EmptyHeader>
            <EmptyTitle>No assets</EmptyTitle>
            <EmptyDescription>No assets matched the current filters.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <AssetsDrillDownTable
          assets={assets}
          sort={sortState}
          onSortChange={() => undefined}
          onOpenAsset={onOpenAsset}
          enableSorting={false}
        />
      )}

      {(data?.total ?? 0) > pageSize ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  goToPage(page - 1);
                }}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {pageNumbers.map((value) => (
              <PaginationItem key={value}>
                <PaginationLink
                  href="#"
                  isActive={page === value}
                  onClick={(event) => {
                    event.preventDefault();
                    goToPage(value);
                  }}
                >
                  {value}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  goToPage(page + 1);
                }}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
