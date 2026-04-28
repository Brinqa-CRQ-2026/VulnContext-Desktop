import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { usePaginatedAssets } from "../../hooks/topology/usePaginatedAssets";
import { useAssetsAnalytics } from "../../hooks/topology/useAssetsAnalytics";
import type { AssetListSortBy, AssetSummary, SortOrder } from "../../api/types";
import { AssetDistributionCharts } from "./AssetDistributionCharts";
import { AssetsDrillDownTable, type SortState } from "./DrillDownTables";
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
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [environment, setEnvironment] = useState<string>("All");
  const [compliance, setCompliance] = useState<string>("All");
  const [sortBy, setSortBy] = useState<AssetListSortBy>("finding_count");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data, loading, error, page, setPage, pageSize } = usePaginatedAssets({
    pageSize: 10,
    businessUnit,
    businessService,
    application,
    status: status === "All" ? null : status,
    environment: environment === "All" ? null : environment,
    compliance: compliance === "All" ? null : compliance,
    search,
    directOnly,
    sortBy,
    sortOrder,
    refreshToken,
  });
  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useAssetsAnalytics({
    businessUnit,
    businessService,
    application,
    status: status === "All" ? null : status,
    environment: environment === "All" ? null : environment,
    compliance: compliance === "All" ? null : compliance,
    search,
    directOnly,
    refreshToken,
  });

  const assets = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    const values: number[] = [];
    for (let index = start; index <= end; index += 1) values.push(index);
    return values;
  }, [page, totalPages]);
  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    assets.forEach((asset) => {
      if (asset.status) values.add(asset.status);
    });
    return ["All", ...Array.from(values).sort((left, right) => left.localeCompare(right))];
  }, [assets]);

  const sortState: SortState<AssetListSortBy> = {
    key: sortBy,
    order: sortOrder,
  };
  const environmentOptions = useMemo(() => {
    const values = new Set<string>();
    assets.forEach((asset) => {
      values.add(normalizeEnvironmentOption(asset.environment));
    });
    return ["All", ...Array.from(values).sort((left, right) => left.localeCompare(right))];
  }, [assets]);
  const complianceOptions = ["All", "Regulated", "PCI", "PII"];

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
            setSearch(searchDraft.trim());
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
            onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
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
                  if (page > 1) setPage(page - 1);
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
                    setPage(value);
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
                  if (page < totalPages) setPage(page + 1);
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

function normalizeEnvironmentOption(environment?: string | null) {
  const value = (environment ?? "").trim().toLowerCase();
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
