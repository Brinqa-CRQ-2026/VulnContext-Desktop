import { ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAssetFindings } from "../../hooks/topology/assets/useAssetFindings";
import { useAssetFindingsAnalytics } from "../../hooks/topology/assets/useAssetFindingsAnalytics";
import { useAssetDetail } from "../../hooks/topology/assets/useAssetDetail";
import { useAssetEnrichment } from "../../hooks/topology/assets/useAssetEnrichment";
import { getPaginationWindow } from "../../lib/pagination/getPaginationWindow";
import type {
  FindingRouteOrigin,
  FindingsSortBy,
  RiskBandFilter,
  ScoredFinding,
  SortOrder,
} from "../../types";
import {
  formatSlugLabel,
  TopologyPageSkeleton,
} from "./TopologyChrome";
import { AssetDistributionChartCard } from "./AssetDistributionCharts";
import { EntityHero } from "./shared/EntityHero";
import { MetricCard, MetricGrid } from "./shared/MetricCard";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../ui/empty";
import { Button } from "../ui/button";
import { FindingsExplorerPanel } from "./shared/FindingsExplorerPanel";
import { StatusBadge } from "./shared/TopologyBadges";

interface AssetFindingsPageProps {
  businessUnitSlug: string | null;
  businessServiceSlug: string | null;
  applicationSlug?: string | null;
  assetId: string | null;
  refreshToken: number;
  onBack: () => void;
  onOpenOverview: () => void;
  onOpenBusinessUnit: () => void;
  onOpenBusinessService: () => void;
  onOpenApplication?: () => void;
  onOpenFinding: (finding: ScoredFinding, origin: FindingRouteOrigin) => void;
}

export function AssetFindingsPage({
  businessUnitSlug,
  businessServiceSlug,
  applicationSlug,
  assetId,
  refreshToken,
  onBack,
  onOpenOverview,
  onOpenBusinessUnit,
  onOpenBusinessService,
  onOpenApplication,
  onOpenFinding,
}: AssetFindingsPageProps) {
  const [bandFilter, setBandFilter] = useState<RiskBandFilter>("All");
  const [sortBy, setSortBy] = useState<FindingsSortBy>("risk_score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [kevOnly, setKevOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("All");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState<string | null>(null);

  const { assetFindings, loading, error, page, setPage, pageSize } = useAssetFindings(assetId, {
    pageSize: 10,
    bandFilter,
    sortBy,
    sortOrder,
    kevOnly,
    source: sourceFilter === "All" ? null : sourceFilter,
    search,
    refreshToken,
  });
  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useAssetFindingsAnalytics(assetId, {
    bandFilter,
    kevOnly,
    source: sourceFilter === "All" ? null : sourceFilter,
    search,
    refreshToken,
  });
  const {
    assetDetail,
    loading: assetDetailLoading,
    error: assetDetailError,
  } = useAssetDetail(assetId, refreshToken);
  const {
    enrichment,
    loading: enrichmentLoading,
    error: enrichmentError,
  } = useAssetEnrichment(assetId, refreshToken, { loadOnMount: true });

  const findings = assetFindings?.items ?? [];
  const sources = Array.from(new Set(findings.map((finding) => finding.source).filter(Boolean))) as string[];
  const showSourceFilter = sources.length > 1;

  useEffect(() => {
    if (sourceFilter !== "All" && !sources.includes(sourceFilter)) {
      setSourceFilter("All");
    }
  }, [sourceFilter, sources]);

  const total = assetFindings?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = useMemo(
    () => getPaginationWindow({ page, totalPages, windowSize: 3 }),
    [page, totalPages]
  );
  const analyticsSummary = analytics?.analytics;
  const summaryAsset = analytics?.asset;

  if (loading) {
    return (
      <TopologyPageSkeleton
        breadcrumbs={[
          { label: "Business Units", onClick: onOpenOverview },
          {
            label: formatSlugLabel(businessUnitSlug, "Business Unit"),
            onClick: onOpenBusinessUnit,
          },
          {
            label: formatSlugLabel(businessServiceSlug, "Business Service"),
            onClick: onOpenBusinessService,
          },
          ...(applicationSlug
            ? [
                {
                  label: formatSlugLabel(applicationSlug, "Application"),
                  onClick: onOpenApplication,
                },
              ]
            : []),
          { label: formatSlugLabel(assetId, "Asset Findings") },
        ]}
        title="Loading asset findings"
        backLabel="Back to Asset List"
        statCount={5}
        tableColumns={9}
      />
    );
  }

  if (error || !assetFindings) {
    return (
      <DetailEmptyState
        title="Asset findings not found"
        description={error ?? "The selected asset findings view could not be loaded."}
        onBack={onBack}
      />
    );
  }

  const findingOrigin: FindingRouteOrigin = {
    mode: "asset",
    businessUnitSlug,
    businessUnitLabel:
      summaryAsset?.business_unit
      ?? assetFindings.asset.business_unit
      ?? formatSlugLabel(businessUnitSlug, "Business Unit"),
    businessServiceSlug,
    businessServiceLabel:
      summaryAsset?.business_service
      ?? assetFindings.asset.business_service
      ?? formatSlugLabel(businessServiceSlug, "Business Service"),
    applicationSlug: applicationSlug ?? null,
    applicationLabel: summaryAsset?.application ?? assetFindings.asset.application ?? null,
    assetId,
    assetLabel: summaryAsset?.hostname ?? assetFindings.asset.hostname ?? assetFindings.asset.asset_id,
  };

  const riskDistribution = {
    critical: analyticsSummary?.risk_bands?.Critical ?? 0,
    high: analyticsSummary?.risk_bands?.High ?? 0,
    medium: analyticsSummary?.risk_bands?.Medium ?? 0,
    low: analyticsSummary?.risk_bands?.Low ?? 0,
    unscored: 0,
  };
  const assetTitle =
    summaryAsset?.hostname ?? assetFindings.asset.hostname ?? assetFindings.asset.asset_id;
  const displayBusinessUnit =
    summaryAsset?.business_unit ??
    assetFindings.asset.business_unit ??
    formatSlugLabel(businessUnitSlug, "Business Unit");
  const displayBusinessService =
    summaryAsset?.business_service ??
    assetFindings.asset.business_service ??
    formatSlugLabel(businessServiceSlug, "Business Service");
  const displayDeviceType =
    enrichment?.device_type ??
    assetDetail?.device_type ??
    assetFindings.asset.device_type ??
    "Device type unavailable";
  const heroTags = [
    assetDetail?.status ?? assetFindings.asset.status,
    assetDetail?.environment ?? assetFindings.asset.environment,
    enrichment?.category ?? assetDetail?.category ?? assetFindings.asset.category,
    enrichment?.internal_or_external ?? assetDetail?.internal_or_external,
  ].flatMap((value) => {
    const trimmed = value?.trim();
    return trimmed ? [trimmed] : [];
  });

  return (
    <div className="space-y-6">
      <EntityHero
        breadcrumbs={[
          { label: "Business Units", onClick: onOpenOverview },
          { label: displayBusinessUnit, onClick: onOpenBusinessUnit },
          { label: displayBusinessService, onClick: onOpenBusinessService },
          { label: assetTitle },
        ]}
        label={displayBusinessService}
        title={assetTitle}
        metadata={displayDeviceType}
        tags={
          heroTags.length > 0 ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {heroTags.map((tag, index) => (
                <StatusBadge key={`${tag}-${index}`} tone="neutral">
                  {tag}
                </StatusBadge>
              ))}
            </div>
          ) : null
        }
        backLabel="Back to Asset List"
        onBack={onBack}
      />

      <MetricGrid className="sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Asset Criticality Score"
          value="7.3"
          valueClassName="text-orange-700"
        />
        <MetricCard
          label="Asset Risk Score"
          value="9.3"
          valueClassName="text-rose-700"
        />
        <MetricCard
          label="High Risk Findings"
          value={26}
        />
        <MetricCard label="KEV Findings" value={1} />
        <MetricCard label="Findings" value={84} />
      </MetricGrid>

      {analyticsError && !analyticsLoading ? (
        <p className="text-sm text-amber-700">
          Analytics are temporarily unavailable. Findings data is still loaded.
        </p>
      ) : null}

      {assetDetailError && !assetDetailLoading ? (
        <p className="text-sm text-amber-700">
          Asset detail is temporarily unavailable. Findings data is still loaded.
        </p>
      ) : null}
      {enrichmentError && !enrichmentLoading ? (
        <p className="text-sm text-amber-700">
          Asset enrichment is temporarily unavailable. Findings data is still loaded.
        </p>
      ) : null}

      <AssetDistributionChartCard
        title="Finding risk spread"
        description="Aggregated finding risk distribution for this asset under the current filters"
        distribution={riskDistribution}
        totalCount={analyticsSummary?.total_findings ?? assetFindings.total}
        countUnit="findings"
        loading={analyticsLoading}
        error={analyticsError}
      />

      <FindingsExplorerPanel
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onApplySearch={() => setSearch(searchDraft.trim() || null)}
        bandFilter={bandFilter}
        onBandFilterChange={setBandFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onToggleSortOrder={() =>
          setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
        }
        kevOnly={kevOnly}
        onKevOnlyChange={setKevOnly}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        sources={sources}
        showSourceFilter={showSourceFilter}
        findings={findings}
        onOpenFinding={(finding) => onOpenFinding(finding, findingOrigin)}
        total={total}
        page={page}
        totalPages={totalPages}
        pageNumbers={pageNumbers}
        onPageChange={setPage}
      />
    </div>
  );
}

function DetailEmptyState({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <Empty>
      <EmptyIcon>
        <ShieldAlert className="h-5 w-5" />
      </EmptyIcon>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" onClick={onBack}>
        Back to Asset List
      </Button>
    </Empty>
  );
}
