import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ScoredFinding } from "../../api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../ui/card";
import { VulnerabilityDrawer } from "./VulnerabilityDrawer";
import { usePaginatedFindings } from "../../hooks/useScoresData";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from "../ui/pagination";

type BandFilter = "All" | "Critical" | "High" | "Medium" | "Low";

export function RiskTable() {
  const [bandFilter, setBandFilter] = useState<BandFilter>("All");
  const [selectedFinding, setSelectedFinding] = useState<ScoredFinding | null>(
    null
  );

  const {
    page,
    pageSize,
    setPage,
    data,
    loading,
    error,
  } = usePaginatedFindings(15);

  const findings = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filteredFindings =
    bandFilter === "All"
      ? findings
      : findings.filter(
          (f) =>
            f.risk_band.toLowerCase() === bandFilter.toLowerCase()
        );

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

  // Simple window around current page for links (e.g., 1 ... 4 5 6 ... 30)
  const pageNumbers = (() => {
    const windowSize = 3;
    const start = Math.max(1, page - windowSize);
    const end = Math.min(totalPages, page + windowSize);
    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  })();

  return (
    <>
      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold">
              All findings by Context-Aware Risk
            </CardTitle>

            {/* Band filter segmented control */}
            <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1 py-0.5 text-xs">
              {(["All", "Critical", "High", "Medium", "Low"] as BandFilter[]).map(
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
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 overflow-auto">
          <div className="min-h-0 flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Finding ID</TableHead>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>CVSS</TableHead>
                  <TableHead>EPSS</TableHead>
                  <TableHead>Internet exposed</TableHead>
                  <TableHead>Risk score</TableHead>
                  <TableHead>Risk band</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-6 text-center">
                      Loading findings...
                    </TableCell>
                  </TableRow>
                )}

                {!loading && error && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-6 text-center text-red-500"
                    >
                      {error}
                    </TableCell>
                  </TableRow>
                )}

                {!loading && !error && filteredFindings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-6 text-center">
                      No findings available for this filter.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  !error &&
                  filteredFindings.map((f, idx) => (
                    <TableRow
                      key={f.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedFinding(f)}
                    >
                      <TableCell>
                        {(page - 1) * pageSize + idx + 1}
                      </TableCell>
                      <TableCell>
                        F-{String(f.finding_id).padStart(4, "0")}
                      </TableCell>
                      <TableCell>{f.asset_id}</TableCell>
                      <TableCell>{f.hostname || "—"}</TableCell>
                      <TableCell>{f.cvss_score.toFixed(1)}</TableCell>
                      <TableCell>{f.epss_score.toFixed(4)}</TableCell>
                      <TableCell>
                        {f.internet_exposed ? "True" : "False"}
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

      <VulnerabilityDrawer
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
      />
    </>
  );
}