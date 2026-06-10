import { Info } from "lucide-react";
import { useMemo, useState } from "react";

import { FindingsTable, type FindingsTableColumn } from "../../components/findings/FindingsTable";
import { StatusBadge } from "../../components/topology/shared/TopologyBadges";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../components/ui/hover-card";
import { getNormalizedFindingTitle } from "../../lib/findings";
import { riskBandPillClass } from "../../lib/findings/findingRisk";
import { normalizeFindingStatus } from "../../lib/findings/findingStatus";
import { formatNumber as formatDisplayNumber } from "../../lib/formatting/numbers";
import { getPaginationWindow } from "../../lib/pagination/getPaginationWindow";
import { useBusinessUnitTopFindings } from "../../hooks/topology/business-units/useBusinessUnitTopFindings";
import type {
  FindingsSortBy,
  RiskBandFilter,
  ScoredFinding,
  SortOrder,
} from "../../types";

const FINDINGS_PAGE_SIZE = 10;
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

const BUSINESS_UNIT_FINDINGS_COLUMNS: Array<FindingsTableColumn<FindingsSortBy>> = [
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

export function BusinessUnitFindingsSection({
  businessUnitSlug,
  businessUnitName,
  refreshToken,
  onOpenFinding,
}: {
  businessUnitSlug: string | null;
  businessUnitName: string;
  refreshToken: number;
  onOpenFinding?: (finding: ScoredFinding) => void;
}) {
  const [bandFilter, setBandFilter] = useState<RiskBandFilter>("All");
  const [sortBy, setSortBy] = useState<FindingsSortBy>("priority_score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showKevOnly, setShowKevOnly] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState<string | null>(null);

  const {
    data: findingsPage,
    loading: findingsLoading,
    error: findingsError,
    page: findingsPageNumber,
    setPage: setFindingsPage,
    pageSize: findingsPageSize,
  } = useBusinessUnitTopFindings(businessUnitSlug, {
    pageSize: FINDINGS_PAGE_SIZE,
    sortBy,
    sortOrder,
    riskBand: bandFilter === "All" ? null : bandFilter,
    search,
    refreshToken,
  });
  const findings = findingsPage?.items ?? [];
  const visibleFindings = showKevOnly
    ? findings.filter((finding) => Boolean(finding.isKev))
    : findings;
  const findingsTotal = findingsPage?.total ?? 0;
  const findingsTotalPages = Math.max(1, Math.ceil(findingsTotal / findingsPageSize));
  const findingsPageNumbers = useMemo(
    () =>
      getPaginationWindow({
        page: findingsPageNumber,
        totalPages: findingsTotalPages,
        windowSize: 3,
      }),
    [findingsPageNumber, findingsTotalPages]
  );
  const findingsEmptyDescription =
    bandFilter === "All" && findingsTotal === 0
      ? "No findings are available for this business unit."
      : showKevOnly
        ? "No KEV findings on this page/filter."
        : "No findings available for this filter.";

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">
          Findings in this Business Unit
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          All vulnerability findings scoped to {businessUnitName}.
        </p>
      </div>
      <FindingsTable
        findings={visibleFindings}
        columns={BUSINESS_UNIT_FINDINGS_COLUMNS}
        loading={findingsLoading}
        error={findingsError}
        emptyTitle="No findings"
        emptyDescription={findingsEmptyDescription}
        searchValue={searchDraft}
        searchPlaceholder="Search finding, CVE, asset, service, status, or source"
        onSearchChange={setSearchDraft}
        onSearchSubmit={() => setSearch(searchDraft.trim() || null)}
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
        onToggleSortOrder={() =>
          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
        }
        pagination={{
          page: findingsPageNumber,
          pageSize: findingsPageSize,
          total: findingsTotal,
          pageNumbers: findingsPageNumbers,
          onPageChange: setFindingsPage,
        }}
        onOpenFinding={onOpenFinding}
        rowAriaLabel={(finding) => `Open ${getNormalizedFindingTitle(finding)}`}
        tableClassName="min-w-[1300px]"
      />
    </section>
  );
}
