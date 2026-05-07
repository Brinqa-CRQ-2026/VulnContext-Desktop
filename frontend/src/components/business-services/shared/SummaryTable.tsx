import type { PropsWithChildren } from "react";

import type { ScoredFinding } from "../../../api/types";
import { getNormalizedFindingTitle } from "../../../lib/findings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { StatusBadge } from "./TopologyBadges";

export function SummaryTable({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <Table className={className}>{children}</Table>;
}

export function SummaryTableEmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="px-4 py-8 text-center text-sm text-slate-500">
        {message}
      </TableCell>
    </TableRow>
  );
}

export function SummaryFindingsTable({
  findings,
  onOpenFinding,
  emptyMessage = "No findings available for this business unit.",
}: {
  findings: ScoredFinding[];
  onOpenFinding: (finding: ScoredFinding) => void;
  emptyMessage?: string;
}) {
  return (
    <SummaryTable className="min-w-[1024px] table-fixed">
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
        {findings.length === 0 ? (
          <SummaryTableEmptyRow colSpan={8} message={emptyMessage} />
        ) : (
          findings.map((finding) => {
            const normalizedStatus = normalizeFindingStatus(finding);

            return (
              <TableRow
                key={finding.id}
                className="cursor-pointer border-b border-slate-200 hover:bg-slate-50/80"
                onClick={() => onOpenFinding(finding)}
              >
                <TableCell className="px-4 py-4">
                  <StatusBadge tone={statusTone(normalizedStatus)}>{normalizedStatus}</StatusBadge>
                </TableCell>
                <TableCell className="px-4 py-4 text-center">
                  {finding.isKev ? <StatusBadge tone="dark">KEV</StatusBadge> : "—"}
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="space-y-1">
                    <div className="font-medium text-slate-900">
                      {getNormalizedFindingTitle(finding)}
                    </div>
                    <div className="text-xs text-slate-500">{finding.cve_id}</div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-4 text-left">{formatNumber(finding.cvss_score)}</TableCell>
                <TableCell className="whitespace-nowrap px-4 py-4 text-left">{formatNumber(finding.epss_score, 4)}</TableCell>
                <TableCell className="whitespace-nowrap px-4 py-4 text-left">
                  {finding.age_in_days !== null && finding.age_in_days !== undefined
                    ? `${formatNumber(finding.age_in_days, 0)}d`
                    : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap border-l border-slate-200 px-4 py-4 text-right font-semibold text-slate-900">
                  {formatNumber(finding.risk_score)}
                </TableCell>
                <TableCell className="px-4 py-4 text-right">
                  <div className="flex justify-end">
                    {finding.risk_band ? (
                      <StatusBadge tone={finding.risk_band}>{finding.risk_band}</StatusBadge>
                    ) : (
                      "—"
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </SummaryTable>
  );
}

function formatNumber(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function normalizeFindingStatus(finding: ScoredFinding) {
  const combined = [finding.status, finding.lifecycle_status]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/fixed|closed|resolved|remediated/.test(combined)) {
    return "Fixed";
  }
  if (/inactive|unactive|retired/.test(combined)) {
    return "Inactive";
  }
  if (/active|open|new/.test(combined)) {
    return "Active";
  }
  return "Active";
}

function statusTone(status: "Active" | "Inactive" | "Fixed"): "low" | "neutral" | "dark" {
  if (status === "Fixed") return "dark";
  if (status === "Active") return "low";
  return "neutral";
}
