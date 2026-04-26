import { ArrowDown, ArrowUp, ChevronDown, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { describeToken, readStoredAuthStateFromLocalStorage } from "../../auth/brinqaAuth";
import { useAssetFindings } from "../../hooks/topology/useAssetFindings";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
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
  const [storedAuthState, setStoredAuthState] = useState(() => readStoredAuthStateFromLocalStorage());
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
    assetDetail,
    loading: assetDetailLoading,
    error: assetDetailError,
  } = useAssetDetail(assetId, refreshToken);
  const {
    enrichment,
    loading: enrichmentLoading,
    error: enrichmentError,
    run: runEnrichment,
  } = useAssetEnrichment(assetId, refreshToken);

  const findings = assetFindings?.items ?? [];
  const sources = Array.from(new Set(findings.map((finding) => finding.source).filter(Boolean))) as string[];

  useEffect(() => {
    if (sourceFilter !== "All" && !sources.includes(sourceFilter)) {
      setSourceFilter("All");
    }
  }, [sourceFilter, sources]);
  useEffect(() => {
    setStoredAuthState(readStoredAuthStateFromLocalStorage());
  }, [refreshToken]);
  const total = assetFindings?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visibleFindings = findings;

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, page - 3);
    const end = Math.min(totalPages, page + 3);
    const values: number[] = [];
    for (let index = start; index <= end; index += 1) values.push(index);
    return values;
  }, [page, totalPages]);

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
        statCount={3}
        tableColumns={5}
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
      assetFindings.asset.business_unit ?? formatSlugLabel(businessUnitSlug, "Business Unit"),
    businessServiceSlug,
    businessServiceLabel:
      assetFindings.asset.business_service
      ?? formatSlugLabel(businessServiceSlug, "Business Service"),
    applicationSlug: applicationSlug ?? null,
    applicationLabel: assetFindings.asset.application ?? null,
    assetId,
    assetLabel: assetFindings.asset.hostname ?? assetFindings.asset.asset_id,
  };

  const sortLabelMap: Record<FindingsSortBy, string> = {
    risk_score: "Sort by display risk",
    internal_risk_score: "Sort by internal risk",
    source_risk_score: "Sort by vendor risk",
    cvss_score: "Sort by CVSS",
    epss_score: "Sort by EPSS",
    age_in_days: "Age",
    due_date: "Sort by due date",
    source: "Sort by source",
  };

  const bandPillClass = (band?: string | null) => {
    const value = (band || "").toLowerCase();
    if (value === "critical") return "bg-rose-100 text-rose-700";
    if (value === "high") return "bg-orange-100 text-orange-700";
    if (value === "medium") return "bg-amber-100 text-amber-700";
    if (value === "low") return "bg-emerald-100 text-emerald-700";
    return "bg-slate-100 text-slate-700";
  };

  const tagPillClass = (tone: "neutral" | "warn") => {
    if (tone === "warn") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-slate-200 bg-slate-50 text-slate-700";
  };

  const formatNumber = (value?: number | null, digits = 1) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    return value.toFixed(digits);
  };
  const tokenDetails = describeToken(storedAuthState.authToken);

  return (
    <Card>
      <CardHeader className="gap-4">
        <TopologyBreadcrumbs
          items={[
            { label: "Business Units", onClick: onOpenOverview },
            {
              label:
                assetFindings.asset.business_unit ??
                formatSlugLabel(businessUnitSlug, "Business Unit"),
              onClick: onOpenBusinessUnit,
            },
            {
              label:
                assetFindings.asset.business_service ??
                formatSlugLabel(businessServiceSlug, "Business Service"),
              onClick: onOpenBusinessService,
            },
            ...(assetFindings.asset.application
              ? [
                  {
                    label: assetFindings.asset.application,
                    onClick: onOpenApplication,
                  },
                ]
              : []),
            { label: assetFindings.asset.hostname ?? assetFindings.asset.asset_id },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Asset findings
            </p>
            <CardTitle className="mt-1 text-base">
              {assetFindings.asset.hostname ?? assetFindings.asset.asset_id}
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">{assetFindings.asset.asset_id}</p>
          </div>
          <Button variant="outline" onClick={onBack}>
            Back to Asset List
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <AssetProbeSection
          assetId={assetId}
          assetDetail={assetDetail}
          assetDetailLoading={assetDetailLoading}
          assetDetailError={assetDetailError}
          enrichment={enrichment}
          enrichmentLoading={enrichmentLoading}
          enrichmentError={enrichmentError}
          onRunEnrichment={() => void runEnrichment()}
          tokenState={tokenDetails}
        />

        <dl className="grid gap-4 md:grid-cols-2">
          <DetailStat label="Findings" value={assetFindings.total} />
          <DetailStat
            label="KEV"
            value={findings.filter((finding) => Boolean(finding.isKev)).length}
          />
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchDraft.trim() || null);
            }}
          >
            <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
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
                    <DropdownMenuItem key={source} onClick={() => setSourceFilter(source)}>
                      {source}
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
                  Sort by display risk
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
              </DropdownMenuContent>
            </DropdownMenu>

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

            <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1 py-0.5 text-xs">
              {(["All", "Critical", "High", "Medium", "Low"] as RiskBandFilter[]).map(
                (band) => {
                  const active = bandFilter === band;
                  return (
                    <button
                      key={band}
                      type="button"
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
                checked={kevOnly}
                onChange={(event) => setKevOnly(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              Show only KEV
            </label>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Finding</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CVSS</TableHead>
                  <TableHead>EPSS</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Display risk</TableHead>
                  <TableHead>Vendor risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleFindings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-6 text-center">
                      {kevOnly ? "No KEV findings on this page/filter." : "No findings available for this filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleFindings.map((finding, index) => (
                    <TableRow
                      key={finding.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => onOpenFinding(finding, findingOrigin)}
                    >
                      <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">
                            {getNormalizedFindingTitle(finding)}
                          </div>
                          <div className="text-xs text-slate-500">{finding.source || "unknown"}</div>
                          <div className="flex flex-wrap items-center gap-1">
                            {finding.cve_id ? (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                                {finding.cve_id}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div>{finding.target_names || "—"}</div>
                          <div className="text-xs text-slate-500">
                            {finding.target_count
                              ? `${finding.target_count} target${finding.target_count === 1 ? "" : "s"}`
                              : "No target count"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[18rem] flex-wrap gap-1">
                          {finding.risk_band ? (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${bandPillClass(finding.risk_band)}`}>
                              {finding.risk_band}
                            </span>
                          ) : null}
                          {finding.lifecycle_status ? (
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tagPillClass("neutral")}`}>
                              {finding.lifecycle_status}
                            </span>
                          ) : null}
                          {finding.compliance_status ? (
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tagPillClass("warn")}`}>
                              {finding.compliance_status}
                            </span>
                          ) : null}
                          {finding.isKev ? (
                            <span className="inline-flex items-center rounded-full border border-slate-900 bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white">
                              KEV
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatNumber(finding.cvss_score)}</TableCell>
                      <TableCell>{formatNumber(finding.epss_score, 4)}</TableCell>
                      <TableCell>
                        {finding.age_in_days !== null && finding.age_in_days !== undefined
                          ? `${formatNumber(finding.age_in_days, 0)}d`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="font-semibold text-slate-900">
                            {formatNumber(finding.risk_score)}
                          </div>
                          <div className="text-xs text-slate-500">{finding.risk_band || "—"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div>{formatNumber(finding.source_risk_score)}</div>
                          <div className="text-xs text-slate-500">
                            {finding.source_risk_rating || finding.source_risk_band || "—"}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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

function AssetProbeSection({
  assetId,
  assetDetail,
  assetDetailLoading,
  assetDetailError,
  enrichment,
  enrichmentLoading,
  enrichmentError,
  onRunEnrichment,
  tokenState,
}: {
  assetId: string | null;
  assetDetail: AssetDetail | null;
  assetDetailLoading: boolean;
  assetDetailError: string | null;
  enrichment: AssetEnrichment | null;
  enrichmentLoading: boolean;
  enrichmentError: string | null;
  onRunEnrichment: () => void;
  tokenState: ReturnType<typeof describeToken>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Local Asset Detail</CardTitle>
          <p className="text-xs text-slate-500">DB-backed request to `/assets/{'{asset_id}'}`.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {assetDetailLoading ? (
            <p className="text-sm text-slate-500">Loading local asset detail…</p>
          ) : assetDetailError ? (
            <p className="text-sm text-rose-600">{assetDetailError}</p>
          ) : assetDetail ? (
            <DetailGrid
              items={[
                ["Asset ID", assetDetail.asset_id],
                ["Hostname", assetDetail.hostname],
                ["Business Unit", assetDetail.business_unit],
                ["Business Service", assetDetail.business_service],
                ["Application", assetDetail.application],
                ["Status", assetDetail.status],
                ["Environment", assetDetail.environment],
                ["Detail Source", assetDetail.detail_source],
                ["Detail Fetched", assetDetail.detail_fetched_at],
              ]}
            />
          ) : (
            <p className="text-sm text-slate-500">No local detail available.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Brinqa Enrichment Probe</CardTitle>
          <p className="text-xs text-slate-500">
            Separate request to `/assets/{'{asset_id}'}/enrichment` using the stored Brinqa token.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailGrid
            items={[
              ["Selected Asset", assetId],
              ["Token Format", tokenState.format],
              [
                "Token Expires",
                typeof tokenState.expiresAt === "number"
                  ? new Date(tokenState.expiresAt).toLocaleString()
                  : "—",
              ],
              ["Token Expired", tokenState.expired ? "Yes" : "No"],
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onRunEnrichment}
              disabled={enrichmentLoading || tokenState.format === "missing"}
            >
              {enrichmentLoading ? "Running enrichment…" : "Run Brinqa enrichment"}
            </Button>
            {tokenState.format === "missing" ? (
              <span className="text-xs text-amber-700">Log in through the Brinqa shell first.</span>
            ) : null}
          </div>
          {enrichmentError ? <p className="text-sm text-rose-600">{enrichmentError}</p> : null}
          {enrichment ? (
            <DetailGrid
              items={[
                ["Status", enrichment.status],
                ["Reason", enrichment.reason],
                ["Source", enrichment.detail_source],
                ["Fetched", enrichment.detail_fetched_at],
                ["Owner", enrichment.owner],
                ["Service Team", enrichment.service_team],
                ["Location", enrichment.location],
                ["Division", enrichment.division],
                ["IT SME", enrichment.it_sme],
                ["IT Director", enrichment.it_director],
                ["Device Type", enrichment.device_type],
                ["Category", enrichment.category],
                ["Internal/External", enrichment.internal_or_external],
                ["Virtual/Physical", enrichment.virtual_or_physical],
                ["Compliance Flags", enrichment.compliance_flags],
                ["DNS Name", enrichment.dnsname],
                ["MAC Addresses", enrichment.mac_addresses],
                ["Tracking Method", enrichment.tracking_method],
                ["Last Scanned", enrichment.last_scanned],
                ["Last Authenticated Scan", enrichment.last_authenticated_scan],
              ]}
            />
          ) : (
            <p className="text-sm text-slate-500">
              Run the enrichment request to inspect Brinqa-returned fields separately from the DB response.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailGrid({ items }: { items: Array<[string, string | number | null | undefined]> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-2 break-words text-sm text-slate-900">{formatProbeValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatProbeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}

function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 text-lg font-semibold text-slate-900">
        {value.toLocaleString()}
      </dd>
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
