import { useMemo, useState } from "react";
import { Info } from "lucide-react";

import { Button } from "../ui/button";
import { FindingsTable, type FindingsTableColumn } from "../findings/FindingsTable";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";
import { useFindingsExplorerState } from "../../hooks/findings/useFindingsExplorerState";
import { formatNumber as formatDisplayNumber } from "../../lib/formatting/numbers";
import { getNormalizedFindingTitle } from "../../lib/findings";
import { riskBandPillClass } from "../../lib/findings/findingRisk";
import { normalizeFindingStatus } from "../../lib/findings/findingStatus";
import type { FindingsSortBy, RiskBandFilter, ScoredFinding } from "../../types";
import { StatusBadge } from "../topology/shared/TopologyBadges";

interface RiskTableProps {
  refreshToken: number;
  onOpenIntegrations: () => void;
  onOpenFinding?: (finding: ScoredFinding) => void;
}

const RISK_BAND_OPTIONS: RiskBandFilter[] = ["All", "Critical", "High", "Medium", "Low"];

const SORT_OPTIONS: Array<{ label: string; value: FindingsSortBy }> = [
  { label: "Priority Score", value: "priority_score" },
  { label: "Risk Score", value: "risk_score" },
  { label: "Age", value: "age_in_days" },
];

const formatNumber = (value?: number | null, digits = 1) =>
  formatDisplayNumber(value, digits, "—");

function deriveRiskBand(score?: number | null) {
  if (score === null || score === undefined) return null;
  if (score >= 9) return "Critical";
  if (score >= 7) return "High";
  if (score >= 4) return "Medium";
  return "Low";
}

function PriorityScoreLabel() {
  return (
    <span className="inline-flex w-full items-center justify-end gap-1.5">
      Priority Score
      <HoverCard openDelay={150} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            aria-label="About priority score"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="bottom"
          align="end"
          className="w-80 max-w-[calc(100vw-2rem)] whitespace-normal text-left text-sm leading-5"
        >
          <div className="font-semibold text-slate-950">Priority Score</div>
          <p className="mt-1 whitespace-normal break-words text-sm font-normal leading-5 text-slate-500 normal-case">
            This is the remediation ranking score. It combines finding risk, asset
            context, and business importance to show what should be fixed first.
          </p>
        </HoverCardContent>
      </HoverCard>
    </span>
  );
}

const MAIN_FINDINGS_COLUMNS: Array<FindingsTableColumn<FindingsSortBy>> = [
  {
    id: "row-number",
    label: "#",
    widthClassName: "w-[72px]",
    headerClassName: "pr-4",
    cellClassName: "pr-4",
    render: (_finding, { absoluteIndex }) => absoluteIndex + 1,
  },
  {
    id: "status",
    label: "Status",
    widthClassName: "w-[132px]",
    sortField: "status",
    render: (finding) => {
      const normalizedStatus = normalizeFindingStatus(finding);
      return (
        <div className="flex items-center gap-2">
          <StatusBadge tone={normalizedStatus === "Fixed" ? "fixed" : "active"}>
            {normalizedStatus}
          </StatusBadge>
          {finding.isKev ? <StatusBadge tone="dark">KEV</StatusBadge> : null}
        </div>
      );
    },
  },
  {
    id: "finding",
    label: "Finding",
    cellClassName: "pl-5",
    headerClassName: "pl-5",
    render: (finding) => (
      <div className="font-medium text-slate-900">
        {finding.cve_id ?? getNormalizedFindingTitle(finding)}
      </div>
    ),
  },
  {
    id: "business-service",
    label: "Business Service",
    widthClassName: "w-[240px]",
    render: (finding) => finding.business_service || "—",
  },
  {
    id: "asset",
    label: "Asset",
    widthClassName: "w-[240px]",
    render: (finding) => finding.asset_name || finding.target_names || "—",
  },
  {
    id: "risk-score",
    label: "Risk Score",
    widthClassName: "w-[150px]",
    headerClassName: "border-l border-slate-200 pl-5 text-right",
    cellClassName: "border-l border-slate-200 pl-5 text-right",
    sortField: "risk_score",
    render: (finding) => (
      <span className="font-semibold text-slate-900">
        {formatNumber(finding.risk_score)}
      </span>
    ),
  },
  {
    id: "priority-score",
    label: <PriorityScoreLabel />,
    widthClassName: "w-[190px]",
    headerClassName: "text-right",
    cellClassName: "text-right",
    sortField: "priority_score",
    render: (finding) => {
      const priorityScore = finding.priority_score ?? finding.risk_score ?? null;
      const priorityBand = deriveRiskBand(priorityScore) ?? finding.risk_band;
      return (
        <div className="flex items-center justify-end gap-3">
          <span className="font-semibold text-slate-900">
            {formatNumber(priorityScore)}
          </span>
          {priorityBand ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${riskBandPillClass(
                priorityBand
              )}`}
            >
              {priorityBand}
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "age",
    label: "Age",
    widthClassName: "w-[120px]",
    headerClassName: "text-right",
    cellClassName: "text-right",
    sortField: "age_in_days",
    render: (finding) => {
      if (finding.age_in_days === null || finding.age_in_days === undefined) {
        return <span className="text-slate-400">—</span>;
      }
      return (
        <span className="font-medium text-slate-700">
          {Math.round(finding.age_in_days).toLocaleString()}d
        </span>
      );
    },
  },
];

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
    toggleSortOrder,
    showKevOnly,
    setShowKevOnly,
    page,
    pageSize,
    loading,
    error,
    visibleFindings,
    total,
    pageNumbers,
    goToPage,
  } = useFindingsExplorerState(refreshToken);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  const findings = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visibleFindings;

    return visibleFindings.filter((finding) => {
      const values = [
        finding.cve_id,
        finding.id,
        finding.record_id,
        finding.uid,
        finding.display_name,
        finding.asset_name,
        finding.asset_id,
        finding.target_names,
        finding.business_service,
        finding.application,
        finding.status,
        finding.lifecycle_status,
        finding.source,
      ];
      return values.some((value) => value?.toLowerCase().includes(term));
    });
  }, [search, visibleFindings]);

  const emptyDescription =
    bandFilter === "All" && total === 0
      ? "No findings are available yet. Populate the backend tables through the documented data scripts, then return here to review the results."
      : showKevOnly
        ? "No KEV findings on this page/filter."
        : "No findings available for this filter.";

  return (
    <FindingsTable
      findings={findings}
      columns={MAIN_FINDINGS_COLUMNS}
      loading={loading}
      error={error}
      emptyTitle="No findings"
      emptyDescription={emptyDescription}
      searchValue={searchDraft}
      searchPlaceholder="Search finding, CVE, asset, service, status, or source"
      onSearchChange={setSearchDraft}
      onSearchSubmit={() => setSearch(searchDraft.trim())}
      filters={[
        {
          id: "risk-band",
          label: "Risk band",
          value: bandFilter,
          options: RISK_BAND_OPTIONS.map((band) => ({ label: band, value: band })),
          onChange: (value) => setBandFilter(value as RiskBandFilter),
        },
        {
          id: "kev-only",
          label: "KEV",
          checked: showKevOnly,
          onChange: setShowKevOnly,
        },
      ]}
      sortOptions={SORT_OPTIONS}
      sortBy={sortBy}
      onSortByChange={setSortBy}
      sortOrder={sortOrder}
      onToggleSortOrder={toggleSortOrder}
      pagination={{ page, pageSize, total, pageNumbers, onPageChange: goToPage }}
      onOpenFinding={onOpenFinding}
      rowAriaLabel={(finding) => `Open ${getNormalizedFindingTitle(finding)}`}
      tableClassName="min-w-[1300px]"
      noDataAction={
        bandFilter === "All" && total === 0 ? (
          <Button onClick={onOpenIntegrations}>View Sources</Button>
        ) : null
      }
    />
  );
}
