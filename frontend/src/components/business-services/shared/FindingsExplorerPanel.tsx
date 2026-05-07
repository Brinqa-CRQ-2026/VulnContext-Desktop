import { ArrowDown, ArrowUp, Search } from "lucide-react";

import type {
  FindingsSortBy,
  RiskBandFilter,
  ScoredFinding,
  SortOrder,
} from "../../../types";
import { formatNumber as formatDisplayNumber } from "../../../lib/formatting/numbers";
import { getNormalizedFindingTitle } from "../../../lib/findings";
import {
  findingStatusTone,
  normalizeFindingStatus,
} from "../../../lib/findings/findingStatus";
import { Button } from "../../ui/button";
import { Card, CardContent } from "../../ui/card";
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
import { StatusBadge } from "./TopologyBadges";

const RISK_BAND_OPTIONS: RiskBandFilter[] = ["All", "Critical", "High", "Medium", "Low"];
const formatNumber = (value?: number | null, digits = 1) =>
  formatDisplayNumber(value, digits, "-");

export function FindingsExplorerPanel({
  searchDraft,
  onSearchDraftChange,
  onApplySearch,
  bandFilter,
  onBandFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
  kevOnly,
  onKevOnlyChange,
  sourceFilter,
  onSourceFilterChange,
  sources,
  showSourceFilter,
  findings,
  onOpenFinding,
  total,
  page,
  totalPages,
  pageNumbers,
  onPageChange,
}: {
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onApplySearch: () => void;
  bandFilter: RiskBandFilter;
  onBandFilterChange: (value: RiskBandFilter) => void;
  sortBy: FindingsSortBy;
  onSortByChange: (value: FindingsSortBy) => void;
  sortOrder: SortOrder;
  onToggleSortOrder: () => void;
  kevOnly: boolean;
  onKevOnlyChange: (value: boolean) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  sources: string[];
  showSourceFilter: boolean;
  findings: ScoredFinding[];
  onOpenFinding: (finding: ScoredFinding) => void;
  total: number;
  page: number;
  totalPages: number;
  pageNumbers: number[];
  onPageChange: (page: number) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onApplySearch();
            }}
          >
            <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
              <Search className="h-4 w-4" />
              <input
                value={searchDraft}
                onChange={(event) => onSearchDraftChange(event.target.value)}
                placeholder="Search finding or CVE"
                className="min-w-[12rem] bg-transparent outline-none"
              />
            </label>
            <Button type="submit" variant="outline" size="sm">
              Apply
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
              <span>Risk band</span>
              <select
                value={bandFilter}
                onChange={(event) => onBandFilterChange(event.target.value as RiskBandFilter)}
                className="bg-transparent outline-none"
              >
                {RISK_BAND_OPTIONS.map((band) => (
                  <option key={band} value={band}>
                    {band}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
              <span>Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => onSortByChange(event.target.value as FindingsSortBy)}
                className="bg-transparent outline-none"
              >
                <option value="risk_score">Display risk</option>
                <option value="internal_risk_score">Internal risk</option>
                <option value="source_risk_score">Vendor risk</option>
                <option value="cvss_score">CVSS</option>
                <option value="epss_score">EPSS</option>
                <option value="age_in_days">Age</option>
                <option value="due_date">Due date</option>
                {showSourceFilter ? <option value="source">Source</option> : null}
              </select>
            </label>

            <Button variant="outline" size="sm" onClick={onToggleSortOrder}>
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

            <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={kevOnly}
                onChange={(event) => onKevOnlyChange(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              KEV only
            </label>

            {showSourceFilter ? (
              <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <span>Source</span>
                <select
                  value={sourceFilter}
                  onChange={(event) => onSourceFilterChange(event.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="All">All</option>
                  {sources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>

        {findings.length === 0 ? (
          <Empty className="min-h-[12rem]">
            <EmptyHeader>
              <EmptyTitle>No findings</EmptyTitle>
              <EmptyDescription>
                No findings match the current filters.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="table-fixed min-w-[1024px]">
              <colgroup>
                <col className="w-[104px]" />
                <col className="w-[72px]" />
                <col />
                <col className="w-[150px]" />
                <col className="w-[150px]" />
                <col className="w-[170px]" />
                <col className="w-[200px]" />
                <col className="w-[128px]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap px-4 text-[11px] uppercase tracking-[0.16em] text-slate-500">Status</TableHead>
                  <TableHead className="px-4 text-center text-[11px] uppercase tracking-[0.16em] text-slate-500">KEV</TableHead>
                  <TableHead className="px-4 text-[11px] uppercase tracking-[0.16em] text-slate-500">Finding</TableHead>
                  <TableHead className="whitespace-nowrap px-4 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">CVSS</TableHead>
                  <TableHead className="whitespace-nowrap px-4 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">EPSS</TableHead>
                  <TableHead className="whitespace-nowrap px-4 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">Age</TableHead>
                  <TableHead className="whitespace-nowrap border-l border-slate-200 px-4 text-right text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    Display risk
                  </TableHead>
                  <TableHead className="whitespace-nowrap px-4 text-right text-[11px] uppercase tracking-[0.16em] text-slate-500">Risk band</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((finding) => {
                  const normalizedStatus = normalizeFindingStatus(finding);
                  return (
                    <TableRow
                      key={finding.id}
                      className="cursor-pointer border-b border-slate-200 hover:bg-slate-50/80"
                      onClick={() => onOpenFinding(finding)}
                    >
                      <TableCell className="px-4 py-4">
                        <StatusBadge tone={findingStatusTone(normalizedStatus)}>{normalizedStatus}</StatusBadge>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        {finding.isKev ? <StatusBadge tone="dark">KEV</StatusBadge> : "-"}
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">
                            {getNormalizedFindingTitle(finding)}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                            {finding.cve_id ? <span>{finding.cve_id}</span> : null}
                            {showSourceFilter && finding.source ? (
                              <>
                                {finding.cve_id ? <Dot /> : null}
                                <span>{finding.source}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-4 text-left">{formatNumber(finding.cvss_score)}</TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-4 text-left">{formatNumber(finding.epss_score, 4)}</TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-4 text-left">
                        {finding.age_in_days !== null && finding.age_in_days !== undefined
                          ? `${formatNumber(finding.age_in_days, 0)}d`
                          : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap border-l border-slate-200 px-4 py-4 text-right font-semibold text-slate-900">
                        {formatNumber(finding.risk_score)}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        <div className="flex justify-end">
                          {finding.risk_band ? <StatusBadge tone={finding.risk_band}>{finding.risk_band}</StatusBadge> : "-"}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {total > 0 ? (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    if (page > 1) onPageChange(page - 1);
                  }}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {pageNumbers.map((value) => (
                <PaginationItem key={value}>
                  <PaginationLink
                    href="#"
                    isActive={value === page}
                    onClick={(event) => {
                      event.preventDefault();
                      onPageChange(value);
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
                    if (page < totalPages) onPageChange(page + 1);
                  }}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Dot() {
  return <span className="text-slate-300">/</span>;
}
