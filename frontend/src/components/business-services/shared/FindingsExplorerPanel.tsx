import type {
  FindingsSortBy,
  RiskBandFilter,
  ScoredFinding,
  SortOrder,
} from "../../../types";
import { formatNumber as formatDisplayNumber } from "../../../lib/formatting/numbers";
import { getNormalizedFindingTitle } from "../../../lib/findings";
import { normalizeFindingStatus } from "../../../lib/findings/findingStatus";
import { DataTable, type DataTableColumn } from "../../shared/data-table/DataTable";
import { StatusBadge } from "./TopologyBadges";

const RISK_BAND_OPTIONS: RiskBandFilter[] = ["All", "Critical", "High", "Medium", "Low"];
const formatNumber = (value?: number | null, digits = 1) =>
  formatDisplayNumber(value, digits, "-");

const SORT_OPTIONS: Array<{ label: string; value: FindingsSortBy }> = [
  { label: "Display risk", value: "risk_score" },
  { label: "Internal risk", value: "internal_risk_score" },
  { label: "Vendor risk", value: "source_risk_score" },
  { label: "CVSS", value: "cvss_score" },
  { label: "EPSS", value: "epss_score" },
  { label: "Age", value: "age_in_days" },
  { label: "Due date", value: "due_date" },
];

const FINDINGS_EXPLORER_COLUMNS: Array<DataTableColumn<ScoredFinding, FindingsSortBy>> = [
  {
    id: "status",
    label: "Status",
    widthClassName: "w-[104px]",
    render: (finding) => {
      const normalizedStatus = normalizeFindingStatus(finding);
      return (
        <StatusBadge tone={normalizedStatus === "Fixed" ? "fixed" : "active"}>
          {normalizedStatus}
        </StatusBadge>
      );
    },
  },
  {
    id: "kev",
    label: "KEV",
    widthClassName: "w-[72px]",
    headerClassName: "text-center",
    cellClassName: "text-center",
    render: (finding) =>
      finding.isKev ? <StatusBadge tone="dark">KEV</StatusBadge> : "-",
  },
  {
    id: "finding",
    label: "Finding",
    render: (finding) => (
      <div className="font-medium text-slate-900">
        {finding.cve_id ?? getNormalizedFindingTitle(finding)}
      </div>
    ),
  },
  {
    id: "score",
    label: "Score",
    widthClassName: "w-[170px]",
    headerClassName: "text-right",
    cellClassName: "whitespace-nowrap text-right font-semibold text-slate-900",
    group: "score",
    render: (finding) => (
      <div className="flex items-center justify-end gap-2">
        <span>{formatNumber(finding.risk_score)}</span>
        {finding.risk_band ? (
          <StatusBadge tone={finding.risk_band}>{finding.risk_band}</StatusBadge>
        ) : (
          <span className="text-slate-500">-</span>
        )}
      </div>
    ),
  },
  {
    id: "cvss",
    label: "CVSS",
    widthClassName: "w-[150px]",
    headerClassName: "text-right",
    cellClassName: "whitespace-nowrap text-right",
    render: (finding) => formatNumber(finding.cvss_score),
  },
  {
    id: "epss",
    label: "EPSS",
    widthClassName: "w-[150px]",
    headerClassName: "text-right",
    cellClassName: "whitespace-nowrap text-right",
    render: (finding) => formatNumber(finding.epss_score, 4),
  },
  {
    id: "age",
    label: "Age",
    widthClassName: "w-[120px]",
    headerClassName: "text-right",
    cellClassName: "whitespace-nowrap text-right",
    render: (finding) =>
      finding.age_in_days !== null && finding.age_in_days !== undefined
        ? `${formatNumber(finding.age_in_days, 0)}d`
        : "-",
  },
];

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
  const pageSize = totalPages > 0 ? Math.max(1, Math.ceil(total / totalPages)) : findings.length;

  return (
    <DataTable<ScoredFinding, FindingsSortBy>
      items={findings}
      getRowId={(finding) => finding.id}
      columns={FINDINGS_EXPLORER_COLUMNS}
      emptyTitle="No findings"
      emptyDescription="No findings match the current filters."
      search={{
        value: searchDraft,
        placeholder: "Search finding or CVE",
        onChange: onSearchDraftChange,
        onSubmit: onApplySearch,
      }}
      filters={[
        {
          id: "risk-band",
          label: "Risk band",
          value: bandFilter,
          options: RISK_BAND_OPTIONS.map((band) => ({ label: band, value: band })),
          onChange: (value) => onBandFilterChange(value as RiskBandFilter),
        },
        {
          id: "kev-only",
          label: "KEV only",
          checked: kevOnly,
          onChange: onKevOnlyChange,
        },
        ...(showSourceFilter
          ? [
              {
                id: "source",
                label: "Source",
                value: sourceFilter,
                options: [
                  { label: "All", value: "All" },
                  ...sources.map((source) => ({ label: source, value: source })),
                ],
                onChange: onSourceFilterChange,
              },
            ]
          : []),
      ]}
      sort={{
        options: showSourceFilter
          ? [...SORT_OPTIONS, { label: "Source", value: "source" }]
          : SORT_OPTIONS,
        sortBy,
        onSortByChange,
        sortOrder,
        onToggleSortOrder,
      }}
      pagination={{ page, pageSize, total, pageNumbers, onPageChange }}
      itemLabelSingular="finding"
      itemLabelPlural="findings"
      onOpenRow={onOpenFinding}
      rowAriaLabel={(finding) => `Open ${getNormalizedFindingTitle(finding)}`}
      tableClassName="min-w-[980px]"
    />
  );
}
