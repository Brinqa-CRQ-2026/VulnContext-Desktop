import { ArrowDown, ArrowUp, Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAssetFindings } from "../../hooks/topology/useAssetFindings";
import { useAssetFindingsAnalytics } from "../../hooks/topology/useAssetFindingsAnalytics";
import { useAssetDetail } from "../../hooks/topology/useAssetDetail";
import { useAssetEnrichment } from "../../hooks/topology/useAssetEnrichment";
import type {
  AssetDetail,
  AssetEnrichment,
  FindingRouteOrigin,
  FindingsSortBy,
  RiskBandFilter,
  ScoredFinding,
  SortOrder,
} from "../../api/types";
import {
  formatSlugLabel,
  TopologyBreadcrumbs,
  TopologyPageSkeleton,
} from "./TopologyChrome";
import { AssetDistributionChartCard } from "./AssetDistributionCharts";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../ui/empty";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { getNormalizedFindingTitle } from "../../lib/findings";

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

const RISK_BAND_OPTIONS: RiskBandFilter[] = ["All", "Critical", "High", "Medium", "Low"];

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
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, page - 3);
    const end = Math.min(totalPages, page + 3);
    const values: number[] = [];
    for (let index = start; index <= end; index += 1) values.push(index);
    return values;
  }, [page, totalPages]);
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

  const kevCount = analyticsSummary?.kev_findings ?? 0;
  const assetCriticalityScore =
    assetDetail?.asset_context_score ?? assetFindings.asset.asset_context_score ?? null;
  const aggregatedFindingRisk =
    assetDetail?.aggregated_finding_risk ?? assetFindings.asset.aggregated_finding_risk ?? null;
  const oldestPriorityAge = analyticsSummary?.oldest_priority_age_days ?? null;
  const highRiskCount = analyticsSummary?.risk_bands?.High ?? 0;
  const riskDistribution = {
    critical: analyticsSummary?.risk_bands?.Critical ?? 0,
    high: analyticsSummary?.risk_bands?.High ?? 0,
    medium: analyticsSummary?.risk_bands?.Medium ?? 0,
    low: analyticsSummary?.risk_bands?.Low ?? 0,
    unscored: 0,
  };

  return (
    <Card>
      <CardHeader className="gap-4">
        <TopologyBreadcrumbs
          items={[
            { label: "Business Units", onClick: onOpenOverview },
            {
              label:
                summaryAsset?.business_unit ??
                assetFindings.asset.business_unit ??
                formatSlugLabel(businessUnitSlug, "Business Unit"),
              onClick: onOpenBusinessUnit,
            },
            {
              label:
                summaryAsset?.business_service ??
                assetFindings.asset.business_service ??
                formatSlugLabel(businessServiceSlug, "Business Service"),
              onClick: onOpenBusinessService,
            },
            ...((summaryAsset?.application ?? assetFindings.asset.application)
              ? [
                  {
                    label: summaryAsset?.application ?? assetFindings.asset.application ?? "",
                    onClick: onOpenApplication,
                  },
                ]
              : []),
            { label: summaryAsset?.hostname ?? assetFindings.asset.hostname ?? assetFindings.asset.asset_id },
          ]}
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Asset findings
            </p>
            <CardTitle className="mt-1 text-base">
              {summaryAsset?.hostname ?? assetFindings.asset.hostname ?? assetFindings.asset.asset_id}
            </CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>{summaryAsset?.asset_id ?? assetFindings.asset.asset_id}</span>
              {(summaryAsset?.business_service ?? assetFindings.asset.business_service) ? <Dot /> : null}
              {(summaryAsset?.business_service ?? assetFindings.asset.business_service) ? (
                <span>{summaryAsset?.business_service ?? assetFindings.asset.business_service}</span>
              ) : null}
              {(summaryAsset?.application ?? assetFindings.asset.application) ? <Dot /> : null}
              {(summaryAsset?.application ?? assetFindings.asset.application) ? (
                <span>{summaryAsset?.application ?? assetFindings.asset.application}</span>
              ) : null}
            </div>
          </div>
          <Button variant="outline" onClick={onBack}>
            Back to Asset List
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
          <dl className="grid gap-3 md:grid-cols-2 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(360px,1.4fr)]">
            <SummaryStat
              label="Asset criticality score"
              value={formatNumber(assetCriticalityScore)}
              tone={scoreTone(assetCriticalityScore)}
              emphasis="hero"
            />
            <SummaryStat
              label="Asset risk score"
              value={formatNumber(aggregatedFindingRisk)}
              tone={scoreTone(aggregatedFindingRisk)}
              emphasis="hero"
            />
            <PrioritySummaryStat
              highRiskCount={highRiskCount}
            />
          </dl>
          <dl className="grid gap-3 md:grid-cols-2 xl:ml-3 xl:w-[272px] xl:flex-none xl:grid-cols-2">
            <SummaryStat label="KEV findings" value={String(kevCount)} emphasis="compact" />
            <SummaryStat
              label="Findings"
              value={(analyticsSummary?.total_findings ?? assetFindings.total).toLocaleString()}
              emphasis="compact"
            />
          </dl>
        </div>
        {analyticsError && !analyticsLoading ? (
          <p className="text-sm text-amber-700">
            Analytics are temporarily unavailable. Findings data is still loaded.
          </p>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <AssetOverviewCard
            assetSummary={assetFindings.asset}
            assetDetail={assetDetail}
            assetDetailLoading={assetDetailLoading}
            assetDetailError={assetDetailError}
            enrichment={enrichment}
            enrichmentLoading={enrichmentLoading}
            enrichmentError={enrichmentError}
          />
          <AssetDistributionChartCard
            title="Finding risk spread"
            description="Aggregated finding risk distribution for this asset under the current filters"
            distribution={riskDistribution}
            totalCount={analyticsSummary?.total_findings ?? assetFindings.total}
            countUnit="findings"
            loading={analyticsLoading}
            error={analyticsError}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchDraft.trim() || null);
            }}
          >
            <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
              <Search className="h-4 w-4" />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
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
                onChange={(event) => setBandFilter(event.target.value as RiskBandFilter)}
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
                onChange={(event) => setSortBy(event.target.value as FindingsSortBy)}
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            >
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
                onChange={(event) => setKevOnly(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              KEV only
            </label>

            {showSourceFilter ? (
              <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <span>Source</span>
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
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
                This asset does not currently have findings returned by the backend.
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
                {findings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center">
                      {kevOnly ? "No KEV findings on this page/filter." : "No findings available for this filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  findings.map((finding) => {
                    const normalizedStatus = normalizeFindingStatus(finding);
                    return (
                      <TableRow
                        key={finding.id}
                        className="cursor-pointer border-b border-slate-200 hover:bg-slate-50/80"
                        onClick={() => onOpenFinding(finding, findingOrigin)}
                      >
                        <TableCell className="px-4 py-4">
                          <Badge tone={statusTone(normalizedStatus)}>{normalizedStatus}</Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          {finding.isKev ? <Badge tone="dark">KEV</Badge> : "—"}
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
                            : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap border-l border-slate-200 px-4 py-4 text-right font-semibold text-slate-900">
                          {formatNumber(finding.risk_score)}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          <div className="flex justify-end">
                            {finding.risk_band ? <Badge tone={finding.risk_band}>{finding.risk_band}</Badge> : "—"}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
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
                    if (page > 1) setPage(page - 1);
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
                      setPage(value);
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
                    if (page < totalPages) setPage(page + 1);
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

function AssetOverviewCard({
  assetSummary,
  assetDetail,
  assetDetailLoading,
  assetDetailError,
  enrichment,
  enrichmentLoading,
  enrichmentError,
}: {
  assetSummary: {
    asset_id: string;
    hostname?: string | null;
    business_unit?: string | null;
    business_service?: string | null;
    application?: string | null;
    status?: string | null;
  };
  assetDetail: AssetDetail | null;
  assetDetailLoading: boolean;
  assetDetailError: string | null;
  enrichment: AssetEnrichment | null;
  enrichmentLoading: boolean;
  enrichmentError: string | null;
}) {
  const merged = {
    hostname: assetDetail?.hostname ?? assetSummary.hostname,
    assetId: assetDetail?.asset_id ?? assetSummary.asset_id,
    businessService: assetDetail?.business_service ?? assetSummary.business_service,
    application: assetDetail?.application ?? assetSummary.application,
    status: assetDetail?.status ?? assetSummary.status,
    environment: assetDetail?.environment,
    owner: enrichment?.owner ?? assetDetail?.owner,
    serviceTeam: enrichment?.service_team ?? assetDetail?.service_team,
    deviceType: enrichment?.device_type ?? assetDetail?.device_type,
    category: enrichment?.category ?? assetDetail?.category,
    boundary: enrichment?.internal_or_external ?? assetDetail?.internal_or_external,
    lastAuthenticatedScan:
      enrichment?.last_authenticated_scan ?? assetDetail?.last_authenticated_scan,
  };

  return (
    <Card>
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm">Asset overview</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Persisted asset context with live descriptive enrichment layered in as it arrives.
            </p>
          </div>
          <EnrichmentStateBadge
            enrichment={enrichment}
            enrichmentLoading={enrichmentLoading}
            enrichmentError={enrichmentError}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {assetDetailError ? (
          <p className="text-sm text-rose-600">{assetDetailError}</p>
        ) : null}
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoTile label="Hostname" value={merged.hostname} loading={assetDetailLoading && !merged.hostname} />
          <InfoTile label="Asset ID" value={merged.assetId} />
          <InfoTile label="Status" value={merged.status} loading={assetDetailLoading && !merged.status} />
          <InfoTile label="Business Service" value={merged.businessService} loading={assetDetailLoading && !merged.businessService} />
          <InfoTile label="Application" value={merged.application} loading={assetDetailLoading && !merged.application} />
          <InfoTile label="Environment" value={merged.environment} loading={assetDetailLoading && !merged.environment} />
          <InfoTile label="Owner" value={merged.owner} loading={enrichmentLoading && !merged.owner} />
          <InfoTile label="Service Team" value={merged.serviceTeam} loading={enrichmentLoading && !merged.serviceTeam} />
          <InfoTile label="Device Type" value={merged.deviceType} loading={enrichmentLoading && !merged.deviceType} />
          <InfoTile label="Category" value={merged.category} loading={enrichmentLoading && !merged.category} />
          <InfoTile label="Internal/External" value={merged.boundary} loading={enrichmentLoading && !merged.boundary} />
          <InfoTile
            label="Last Authenticated Scan"
            value={formatDateTime(merged.lastAuthenticatedScan)}
            loading={enrichmentLoading && !merged.lastAuthenticatedScan}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function PrioritySummaryStat({
  highRiskCount,
}: {
  highRiskCount: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Priority spotlight
      </dt>
      <dd className="mt-3 text-[1.8rem] leading-tight text-slate-900">
        <span className="font-extrabold">{highRiskCount.toLocaleString()}</span>{" "}
        <span className="font-semibold text-[1.2rem]" >High risk findings</span>
      </dd>
    </div>
  );
}

function EnrichmentStateBadge({
  enrichment,
  enrichmentLoading,
  enrichmentError,
}: {
  enrichment: AssetEnrichment | null;
  enrichmentLoading: boolean;
  enrichmentError: string | null;
}) {
  if (enrichmentLoading) {
    return <Badge tone="neutral">Loading enrichment…</Badge>;
  }
  if (enrichmentError) {
    return <Badge tone="warn">Enrichment unavailable</Badge>;
  }
  if (!enrichment) {
    return <Badge tone="neutral">Enrichment pending</Badge>;
  }

  const copy = {
    success: "Enrichment loaded",
    partial_success: "Partial enrichment",
    missing_token: "Missing Brinqa token",
    unauthorized_token: "Unauthorized",
    no_related_source: "No related source",
    upstream_error: "Upstream error",
  } as const;

  const toneMap = {
    success: "low",
    partial_success: "neutral",
    missing_token: "warn",
    unauthorized_token: "warn",
    no_related_source: "neutral",
    upstream_error: "warn",
  } as const;

  return <Badge tone={toneMap[enrichment.status]}>{copy[enrichment.status]}</Badge>;
}

function SummaryStat({
  label,
  value,
  hint,
  tone,
  emphasis = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  emphasis?: "default" | "hero" | "compact";
}) {
  const valueClass =
    emphasis === "hero"
      ? "mt-3 text-[2rem] font-extrabold leading-none md:text-[2.25rem]"
      : emphasis === "compact"
        ? "mt-3 text-[1.75rem] font-bold leading-none"
        : "mt-2 text-lg font-semibold";

  return (
    <div
      className={
        emphasis === "hero"
          ? "rounded-lg border border-slate-200 bg-white p-5"
          : "rounded-lg border border-slate-200 bg-white p-4"
      }
    >
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`${valueClass} ${tone ? riskTextClass(tone) : "text-slate-900"}`}>
        {value}
      </dd>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function InfoTile({
  label,
  value,
  loading = false,
}: {
  label: string;
  value: string | null | undefined;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 break-words text-sm text-slate-900">
        {loading ? "Loading…" : formatProbeValue(value)}
      </dd>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: string;
  tone: "Critical" | "High" | "Medium" | "Low" | "neutral" | "warn" | "dark" | "low";
}) {
  const className =
    tone === "Critical"
      ? "bg-rose-100 text-rose-700"
      : tone === "High"
        ? "bg-orange-100 text-orange-700"
        : tone === "Medium"
          ? "bg-amber-100 text-amber-700"
          : tone === "Low" || tone === "low"
            ? "bg-emerald-100 text-emerald-700"
            : tone === "warn"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : tone === "dark"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

function Dot() {
  return <span className="text-slate-300">•</span>;
}

function riskTextClass(band: string) {
  const value = band.toLowerCase();
  if (value === "critical") return "text-rose-700";
  if (value === "high") return "text-orange-700";
  if (value === "medium") return "text-amber-700";
  if (value === "low") return "text-emerald-700";
  return "text-slate-900";
}

function formatProbeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function formatNumber(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function scoreTone(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return undefined;
  }
  if (value >= 9) return "Critical";
  if (value >= 7) return "High";
  if (value >= 4) return "Medium";
  return "Low";
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
