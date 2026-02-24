import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ScoredFinding, SourceSummary, getSourcesSummary } from "../../api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../ui/card";
import { Button } from "../ui/button";
import { usePaginatedFindings } from "../../hooks/useScoresData";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from "../ui/pagination";
import {
  FindingsSortBy,
  RiskBandFilter,
  SortOrder,
} from "../../api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface RiskTableProps {
  refreshToken: number;
  onOpenIntegrations: () => void;
  onDataChanged?: () => void;
  onOpenFinding?: (finding: ScoredFinding) => void;
}

export function RiskTable({
  refreshToken,
  onOpenIntegrations,
  onOpenFinding,
}: RiskTableProps) {
  const [bandFilter, setBandFilter] = useState<RiskBandFilter>("All");
  const [sortBy, setSortBy] = useState<FindingsSortBy>("risk_score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [sourceFilter, setSourceFilter] = useState<string>("All");
  const [showKevOnly, setShowKevOnly] = useState(false);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  useEffect(() => {
    let isActive = true;

    async function loadSources() {
      try {
        const summaries = await getSourcesSummary();
        if (!isActive) return;
        setSources(summaries);
        if (
          sourceFilter !== "All" &&
          !summaries.some((item) => item.source === sourceFilter)
        ) {
          setSourceFilter("All");
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadSources();
    return () => {
      isActive = false;
    };
  }, [refreshToken]);

  useEffect(() => {
    if (sourceFilter === "All") {
      return;
    }
    if (!sources.some((item) => item.source === sourceFilter)) {
      setSourceFilter("All");
    }
  }, [sourceFilter, sources]);

  const {
    page,
    pageSize,
    setPage,
    data,
    loading,
    error,
  } = usePaginatedFindings(
    20,
    bandFilter,
    sortBy,
    sortOrder,
    sourceFilter === "All" ? null : sourceFilter,
    refreshToken
  );

  const findings = data?.items ?? [];
  const visibleFindings = showKevOnly ? findings.filter((f) => Boolean(f.isKev)) : findings;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const bandPillClass = (band: string) => {
    const b = band.toLowerCase();
    if (b === "critical") {
      return "bg-rose-100 text-rose-700";
    }
    if (b === "high") {
      return "bg-orange-100 text-orange-700";
    }
    if (b === "medium") {
      return "bg-amber-100 text-amber-700";
    }
    if (b === "low") {
      return "bg-emerald-100 text-emerald-700";
    }
    return "bg-slate-100 text-slate-700";
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const tagPillClass = (tone: "neutral" | "warn" | "success") => {
    if (tone === "warn") return "border-amber-200 bg-amber-50 text-amber-700";
    if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    return "border-slate-200 bg-slate-50 text-slate-700";
  };

  // Simple window around current page for links (e.g., 1 ... 4 5 6 ... 30)
  const pageNumbers = (() => {
    const windowSize = 3;
    const start = Math.max(1, page - windowSize);
    const end = Math.min(totalPages, page + windowSize);
    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  })();

  const sortLabelMap: Record<FindingsSortBy, string> = {
    risk_score: "Sort by risk score",
    cvss_score: "Sort by CVSS",
    epss_score: "Sort by EPSS",
    vuln_age_days: "Sort by vulnerability age",
    source: "Sort by source",
  };

  return (
    <>
      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-sm font-semibold">
              All findings by Context-Aware Risk
            </CardTitle>

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
                  {sortLabelMap[sortBy]}
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Sort Field</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setSortBy("risk_score")}>
                    Sort by risk score
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("cvss_score")}>
                    Sort by CVSS
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("epss_score")}>
                    Sort by EPSS
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("vuln_age_days")}>
                    Sort by vulnerability age
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
                onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
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
              {/* Band filter segmented control */}
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
            {!loading && !error && bandFilter === "All" && total === 0 ? (
              <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">
                <p className="text-sm text-slate-600">
                  No findings in the database yet. Add a source integration to start ingesting scanner data.
                </p>
                <Button onClick={onOpenIntegrations}>Go to Integrations</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>CVE ID</TableHead>
                    <TableHead>CVSS</TableHead>
                    <TableHead>EPSS</TableHead>
                    <TableHead>Detection Method</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Risk score</TableHead>
                    <TableHead>Risk band</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-6 text-center">
                        Loading findings...
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && error && (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="py-6 text-center text-red-500"
                      >
                        {error}
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && !error && visibleFindings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-6 text-center">
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
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => onOpenFinding?.(f)}
                      >
                        <TableCell>
                          {(page - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>{f.source || "unknown"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <span>{f.cve_id || "—"}</span>
                            {f.isKev ? (
                              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                                KEV
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{f.cvss_score.toFixed(1)}</TableCell>
                        <TableCell>{f.epss_score.toFixed(4)}</TableCell>
                        <TableCell>{f.detection_method || "—"}</TableCell>
                        <TableCell>
                          <div className="flex max-w-[20rem] flex-wrap gap-1">
                            {f.lifecycle_status ? (
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tagPillClass("neutral")}`}
                              >
                                {f.lifecycle_status}
                              </span>
                            ) : null}
                            {f.isKev ? (
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tagPillClass("warn")}`}
                              >
                                actively exploited
                              </span>
                            ) : null}
                            {f.disposition && f.disposition !== "none" ? (
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tagPillClass("warn")}`}
                              >
                                {f.disposition.replaceAll("_", " ")}
                              </span>
                            ) : null}
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tagPillClass(
                                f.internet_exposed ? "warn" : "success"
                              )}`}
                            >
                              {f.internet_exposed ? "internet" : "internal"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{f.risk_score.toFixed(1)}</TableCell>
                        <TableCell>
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold " +
                              bandPillClass(f.risk_band)
                            }
                          >
                            {f.risk_band}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination controls */}
          {total > 0 && (
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing{" "}
                {total === 0
                  ? "0"
                  : `${(page - 1) * pageSize + 1}-${Math.min(
                      page * pageSize,
                      total
                    )}`}{" "}
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
    </>
  );
}
