import { useAssetInventoryState } from "../../hooks/topology/assets/useAssetInventoryState";
import type { AssetListSortBy, AssetSummary } from "../../types";
import {
  deriveAssetStatus,
  formatCategory,
  formatEnvironment,
  getAssetName,
  getAssetType,
  getComplianceBadges,
} from "../../lib/assets/assetFormatters";
import { formatNumber as formatDisplayNumber } from "../../lib/formatting/numbers";
import { formatText as formatDisplayText } from "../../lib/formatting/text";
import { AssetDistributionCharts } from "./AssetDistributionCharts";
import { DataTable, type DataTableColumn } from "../shared/data-table/DataTable";
import { Pill } from "../ui/pill";

const formatNullable = (value?: number | null, digits = 1) =>
  formatDisplayNumber(value, digits, "—");
const formatText = (value?: string | null) => formatDisplayText(value, "—");

const ASSET_SORT_OPTIONS: Array<{ label: string; value: AssetListSortBy }> = [
  { label: "Findings", value: "finding_count" },
  { label: "Asset / hostname", value: "name" },
  { label: "Asset type", value: "asset_type" },
  { label: "Criticality", value: "asset_criticality" },
  { label: "Status", value: "status" },
];

const ASSET_COLUMNS: Array<DataTableColumn<AssetSummary, AssetListSortBy>> = [
  {
    id: "status",
    label: "Status",
    widthClassName: "w-[112px]",
    render: (asset) => <AssetStatusBadge status={asset.status} />,
  },
  {
    id: "compliance",
    label: "Compliance",
    widthClassName: "w-[150px]",
    render: (asset) => <AssetComplianceBadges asset={asset} />,
  },
  {
    id: "asset",
    label: "Asset",
    render: (asset) => (
      <div className="font-medium text-slate-900">{getAssetName(asset)}</div>
    ),
  },
  {
    id: "category",
    label: "Category",
    widthClassName: "w-[150px]",
    render: (asset) => formatCategory(asset.category),
  },
  {
    id: "asset-type",
    label: "Asset type",
    widthClassName: "w-[170px]",
    cellClassName: "text-slate-500",
    render: (asset) => getAssetType(asset),
  },
  {
    id: "environment",
    label: "Environment",
    widthClassName: "w-[150px]",
    render: (asset) => formatEnvironment(asset.environment),
  },
  {
    id: "asset-criticality",
    label: "Asset Criticality",
    widthClassName: "w-[170px]",
    headerClassName: "text-right",
    cellClassName: "text-right",
    group: "score",
    render: (asset) => formatNullable(asset.asset_context_score),
  },
  {
    id: "aggregated-finding-risk",
    label: "Aggregated Finding Risk",
    widthClassName: "w-[210px]",
    headerClassName: "text-right",
    cellClassName: "text-right",
    render: (asset) => formatNullable(asset.aggregated_finding_risk),
  },
  {
    id: "total-findings",
    label: "Total Findings",
    widthClassName: "w-[150px]",
    headerClassName: "text-right font-semibold text-slate-900",
    cellClassName: "text-right font-semibold text-slate-900",
    render: (asset) => asset.finding_count.toLocaleString(),
  },
];

export function AssetInventoryPanel({
  businessUnit,
  businessService,
  application,
  directOnly = false,
  wrapInventoryContentInCard = false,
  refreshToken,
  onOpenAsset,
}: {
  businessUnit?: string | null;
  businessService?: string | null;
  application?: string | null;
  directOnly?: boolean;
  wrapInventoryContentInCard?: boolean;
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

      <DataTable<AssetSummary, AssetListSortBy>
        items={assets}
        getRowId={(asset) => asset.asset_id}
        columns={ASSET_COLUMNS}
        loading={loading}
        loadingMessage="Loading assets"
        error={error}
        emptyTitle="No assets"
        emptyDescription="No assets matched the current filters."
        search={{
          value: searchDraft,
          placeholder: "Search asset or ID",
          onChange: setSearchDraft,
          onSubmit: applySearch,
        }}
        filters={[
          {
            id: "status",
            label: "Status",
            value: status,
            options: statusOptions.map((value) => ({ label: value, value })),
            onChange: setStatus,
          },
          {
            id: "environment",
            label: "Environment",
            value: environment,
            options: environmentOptions.map((value) => ({ label: value, value })),
            onChange: setEnvironment,
          },
          {
            id: "compliance",
            label: "Compliance",
            value: compliance,
            options: complianceOptions.map((value) => ({ label: value, value })),
            onChange: setCompliance,
          },
        ]}
        sort={{
          options: ASSET_SORT_OPTIONS,
          sortBy,
          onSortByChange: setSortBy,
          sortOrder,
          onToggleSortOrder: toggleSortOrder,
        }}
        pagination={
          (data?.total ?? 0) > pageSize
            ? { page, pageSize, total: data?.total ?? 0, pageNumbers, onPageChange: goToPage }
            : undefined
        }
        itemLabelSingular="asset"
        itemLabelPlural="assets"
        onOpenRow={onOpenAsset}
        rowAriaLabel={(asset) => `Open ${getAssetName(asset)}`}
        carded={wrapInventoryContentInCard}
        tableClassName="min-w-[1280px]"
      />
    </div>
  );
}

function AssetStatusBadge({ status }: { status?: string | null }) {
  const normalized = deriveAssetStatus(status);
  return <Pill tone={normalized === "Active" ? "success" : "neutral"}>{normalized}</Pill>;
}

function AssetComplianceBadges({ asset }: { asset: AssetSummary }) {
  const badges = getComplianceBadges(asset);
  if (badges.length === 0) {
    return <span className="text-slate-500">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <Pill key={badge} tone={badge === "PCI" || badge === "PII" ? "warn" : "neutral"}>
          {badge}
        </Pill>
      ))}
    </div>
  );
}
