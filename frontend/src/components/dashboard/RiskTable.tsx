import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import type { RiskBandFilter, ScoredFinding } from "../../types";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { useFindingsExplorerState } from "../../hooks/findings/useFindingsExplorerState";
import { formatNumber as formatDisplayNumber } from "../../lib/formatting/numbers";
import { getNormalizedFindingTitle } from "../../lib/findings";
import { riskBandPillClass } from "../../lib/findings/findingRisk";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from "../ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { LoadingSpinnerState } from "../shared/LoadingSpinnerState";
import { normalizeFindingStatus } from "../../lib/findings/findingStatus";
import { StatusBadge } from "../business-services/shared/TopologyBadges";

interface RiskTableProps {
  refreshToken: number;
  onOpenIntegrations: () => void;
  onOpenFinding?: (finding: ScoredFinding) => void;
}

const formatNumber = (value?: number | null, digits = 1) =>
  formatDisplayNumber(value, digits, "—");

export function RiskTable({
  refreshToken,
  onOpenIntegrations,
  onOpenFinding,
}: RiskTableProps) {
  const {
    bandFilter,
    setBandFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    toggleSortOrder,
    sourceFilter,
    setSourceFilter,
    showKevOnly,
    setShowKevOnly,
    sources,
    page,
    pageSize,
    loading,
    error,
    visibleFindings,
    total,
    pageNumbers,
    goToPage,
    sortLabel,
  } = useFindingsExplorerState(refreshToken);

  return (
    <Card className="flex-1 overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                Source: {sourceFilter}
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by source</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSourceFilter("All")}>
                  All sources
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {sources.length === 0 ? (
                  <DropdownMenuItem disabled>No sources yet</DropdownMenuItem>
                ) : (
                  sources.map((source) => (
                    <DropdownMenuItem
                      key={source.source}
                      onClick={() => setSourceFilter(source.source)}
                    >
                      {source.source} ({source.total_findings.toLocaleString()})
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                {sortLabel}
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Sort Field</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSortBy("risk_score")}>
                  Sort by Risk Score
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("internal_risk_score")}>
                  Sort by internal risk
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("source_risk_score")}>
                  Sort by vendor risk
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("cvss_score")}>
                  Sort by CVSS
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("epss_score")}>
                  Sort by EPSS
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("age_in_days")}>
                  Sort by age
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("due_date")}>
                  Sort by due date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("source")}>
                  Sort by source
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Direction</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSortOrder("asc")}>
                  Ascending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder("desc")}>
                  Descending
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortOrder}
            >
              {sortOrder === "asc" ? (
                <>
                  <ArrowUp className="h-4 w-4" /> Asc
                </>
              ) : (
                <>
                  <ArrowDown className="h-4 w-4" /> Desc
                </>
              )}
            </Button>

            <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1 py-0.5 text-xs">
              {(["All", "Critical", "High", "Medium", "Low"] as RiskBandFilter[]).map(
                (band) => {
                  const active = bandFilter === band;
                  return (
                    <button
                      key={band}
                      onClick={() => setBandFilter(band)}
                      className={`rounded-full px-2 py-0.5 transition ${
                        active
                          ? "bg-slate-900 text-slate-50"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {band}
                    </button>
                  );
                }
              )}
            </div>

            <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={showKevOnly}
                onChange={(e) => setShowKevOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              Show only KEV
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 overflow-auto">
        <div className="min-h-0 flex-1">
          {loading ? (
            <LoadingSpinnerState message="Loading findings" className="min-h-[16rem]" />
          ) : null}
          {!loading && !error && bandFilter === "All" && total === 0 ? (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">
              <p className="text-sm text-slate-600">
                No findings are available yet. Populate the backend tables through the
                documented data scripts, then return here to review the results.
              </p>
              <Button onClick={onOpenIntegrations}>View Sources</Button>
            </div>
          ) : (
            <Table className="table-fixed min-w-[1360px]">
              <colgroup>
                <col className="w-[84px]" />
                <col className="w-[132px]" />
                <col />
                <col className="w-[210px]" />
                <col className="w-[200px]" />
                <col className="w-[150px]" />
                <col className="w-[150px]" />
                <col className="w-[150px]" />
                <col className="w-[150px]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pr-4">#</TableHead>
                  <TableHead className="whitespace-nowrap px-4">Status</TableHead>
                  <TableHead className="pl-4">Finding</TableHead>
                  <TableHead>Business Service</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="whitespace-nowrap border-l border-slate-200 pl-4 text-left">
                    Business Importance
                  </TableHead>
                  <TableHead className="text-right">Asset Criticality</TableHead>
                  <TableHead className="text-right">Risk Score</TableHead>
                  <TableHead className="text-right">Priority Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center">
                      Loading findings...
                    </TableCell>
                  </TableRow>
                )}

                {!loading && error && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                )}

                {!loading && !error && visibleFindings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center">
                      {showKevOnly
                        ? "No KEV findings on this page/filter."
                        : "No findings available for this filter."}
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  !error &&
                  visibleFindings.map((f, idx) => (
                    <TableRow
                      key={f.id}
                      className="h-[4.25rem] cursor-pointer hover:bg-slate-50"
                      onClick={() => onOpenFinding?.(f)}
                    >
                      <TableCell className="pr-4">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="px-4">
                        <div className="flex items-center gap-1">
                          {(() => {
                            const normalizedStatus = normalizeFindingStatus(f);
                            return (
                              <>
                                <StatusBadge
                                  tone={normalizedStatus === "Fixed" ? "fixed" : "active"}
                                >
                                  {normalizedStatus}
                                </StatusBadge>
                                {f.isKev ? <StatusBadge tone="dark">KEV</StatusBadge> : null}
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="pl-4">
                        <div className="font-medium text-slate-900">
                          {f.cve_id ?? getNormalizedFindingTitle(f)}
                        </div>
                      </TableCell>
                      <TableCell>{f.business_service || "—"}</TableCell>
                      <TableCell>{f.asset_name || f.target_names || "—"}</TableCell>
                      <TableCell className="border-l border-slate-200 pl-4 text-left text-slate-500">
                        -
                      </TableCell>
                      <TableCell className="text-right">
                        -
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-semibold text-slate-900">
                            {formatNumber(f.risk_score)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {f.risk_band ? (
                          <span
                            className={`inline-flex items-center text-[11px] font-semibold ${riskBandPillClass(
                              f.risk_band
                            )}`}
                          >
                            {f.risk_band}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </div>

        {total > 0 && (
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing{" "}
              {total === 0
                ? "0"
                : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)}`}{" "}
              of {total.toLocaleString()} findings
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    size="default"
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(page - 1);
                    }}
                  />
                </PaginationItem>

                {pageNumbers.map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      size="default"
                      isActive={p === page}
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(p);
                      }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    size="default"
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(page + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
