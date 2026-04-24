import type { ReactNode } from "react";

import type { FindingRouteOrigin, ScoredFinding } from "../../api";
import type { BreadcrumbEntry } from "../business-services/TopologyChrome";
import { TopologyBreadcrumbs } from "../business-services/TopologyChrome";
import { useFindingDetails } from "../../hooks/findings/useFindingDetails";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface FindingDetailPageProps {
  findingId: string;
  refreshToken: number;
  origin?: FindingRouteOrigin | null;
  breadcrumbs: BreadcrumbEntry[];
  backLabel: string;
  onBack: () => void;
  onDataChanged?: () => void;
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}

function formatNumber(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function formatAge(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(0)}d`;
}

function formatStatus(finding: ScoredFinding) {
  return [finding.status, finding.lifecycle_status].filter(Boolean).join(" / ") || "—";
}

function isPopulated(value?: string | null) {
  return Boolean(value && value.trim());
}

function badgeClass(kind: "neutral" | "warn" | "band", value?: string | null) {
  if (kind === "band") {
    const band = (value || "").toLowerCase();
    if (band === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
    if (band === "high") return "border-orange-200 bg-orange-50 text-orange-700";
    if (band === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
    if (band === "low") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (kind === "warn") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Badge({
  children,
  kind = "neutral",
  value,
}: {
  children: ReactNode;
  kind?: "neutral" | "warn" | "band";
  value?: string | null;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(kind, value)}`}
    >
      {children}
    </span>
  );
}

function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DetailList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {item.label}
          </dt>
          <dd className="mt-2 break-words text-sm text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function renderLink(value?: string | null) {
  if (!isPopulated(value)) return "—";
  return (
    <a
      className="text-sky-700 underline underline-offset-2"
      href={value ?? undefined}
      target="_blank"
      rel="noreferrer"
    >
      {value}
    </a>
  );
}

function getFindingTitle(finding: ScoredFinding) {
  return finding.display_name?.trim() || finding.cve_id || "Finding";
}

function getAssetLabel(finding: ScoredFinding, origin?: FindingRouteOrigin | null) {
  if (origin?.assetLabel) return origin.assetLabel;
  if (isPopulated(finding.target_names)) return finding.target_names;
  return "—";
}

function HeaderState({
  breadcrumbs,
  backLabel,
  onBack,
  title,
  subtitle,
}: {
  breadcrumbs: BreadcrumbEntry[];
  backLabel: string;
  onBack: () => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <TopologyBreadcrumbs items={breadcrumbs} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <Button size="sm" variant="outline" onClick={onBack}>
            {backLabel}
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

export function FindingDetailPage({
  findingId,
  refreshToken,
  origin,
  breadcrumbs,
  backLabel,
  onBack,
}: FindingDetailPageProps) {
  const { finding, loading, error } = useFindingDetails(findingId, refreshToken);

  if (loading) {
    return (
      <HeaderState
        breadcrumbs={breadcrumbs}
        backLabel={backLabel}
        onBack={onBack}
        title="Loading finding"
      />
    );
  }

  if (error || !finding) {
    return (
      <Card>
        <CardHeader className="gap-4">
          <TopologyBreadcrumbs items={breadcrumbs} />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Finding not available</CardTitle>
              <p className="mt-1 text-sm text-rose-600">
                {error || "Finding not found."}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={onBack}>
              {backLabel}
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const title = getFindingTitle(finding);
  const assetLabel = getAssetLabel(finding, origin);
  const businessContext = [
    origin?.businessUnitLabel,
    origin?.businessServiceLabel,
    origin?.applicationLabel,
  ]
    .filter(Boolean)
    .join(" / ");
  const hasDistinctCveDescription =
    isPopulated(finding.cveDescription)
    && finding.cveDescription?.trim() !== finding.description?.trim();
  const scoringItems = [
    { label: "Display risk source", value: finding.score_source || "Vendor fallback" },
    {
      label: "Score version / timestamp",
      value: [finding.crq_score_version, formatDate(finding.crq_scored_at, true)]
        .filter((value) => value && value !== "—")
        .join(" • ") || "—",
    },
    {
      label: "Vendor risk rating / band",
      value: [finding.source_risk_rating, finding.source_risk_band]
        .filter(Boolean)
        .join(" / ") || "—",
    },
  ];
  if (isPopulated(finding.crq_notes)) {
    scoringItems.push({ label: "CRQ notes", value: finding.crq_notes ?? "—" });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="gap-4">
          <TopologyBreadcrumbs items={breadcrumbs} />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{finding.source || "Unknown source"}</Badge>
                <Badge kind="band" value={finding.risk_band}>
                  {`${finding.risk_band || "Unrated"} • ${formatNumber(finding.risk_score)}`}
                </Badge>
                {finding.source_risk_score !== null && finding.source_risk_score !== undefined ? (
                  <Badge>{`Vendor ${formatNumber(finding.source_risk_score)}`}</Badge>
                ) : null}
                {finding.cve_id ? <Badge>{finding.cve_id}</Badge> : null}
                {finding.status ? <Badge>{finding.status}</Badge> : null}
                {finding.lifecycle_status ? <Badge>{finding.lifecycle_status}</Badge> : null}
                {finding.isKev ? <Badge kind="warn">KEV</Badge> : null}
              </div>
              <CardTitle className="mt-3 text-xl">{title}</CardTitle>
              <p className="mt-2 text-sm text-slate-500">
                {assetLabel !== "—" ? `${assetLabel} • ` : ""}
                {finding.source || "Unknown source"}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={onBack}>
              {backLabel}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <SummaryStat
          label="Display risk"
          value={formatNumber(finding.risk_score)}
          hint={finding.risk_band || "Unrated"}
        />
        <SummaryStat
          label="Vendor risk"
          value={formatNumber(finding.source_risk_score)}
          hint={finding.source_risk_rating || finding.source_risk_band || "Unspecified"}
        />
        <SummaryStat
          label="CVSS"
          value={formatNumber(finding.cvss_score)}
          hint={finding.cvss_severity || "Unspecified"}
        />
        <SummaryStat
          label="EPSS"
          value={formatNumber(finding.epss_score, 4)}
          hint={`Percentile ${formatNumber(finding.epss_percentile, 4)}`}
        />
        <SummaryStat label="Status" value={formatStatus(finding)} hint={finding.compliance_status || "—"} />
        <SummaryStat label="Asset" value={assetLabel} hint={origin?.assetId || "—"} />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Overview">
          <DetailList
            items={[
              {
                label: "Display risk score / band",
                value: `${formatNumber(finding.risk_score)} / ${finding.risk_band || "Unrated"}`,
              },
              {
                label: "Vendor risk score",
                value: formatNumber(finding.source_risk_score),
              },
              { label: "CVSS", value: formatNumber(finding.cvss_score) },
              { label: "EPSS", value: formatNumber(finding.epss_score, 4) },
              { label: "Status / lifecycle", value: formatStatus(finding) },
              { label: "Age", value: formatAge(finding.age_in_days) },
              { label: "Asset name / target", value: assetLabel },
            ]}
          />
        </Section>

        <Section title="What This Is">
          <div className="space-y-4">
            {isPopulated(finding.description) || isPopulated(finding.summary) ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {finding.description || finding.summary}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No description is available for this finding.</p>
            )}
            {hasDistinctCveDescription ? (
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  CVE Description
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {finding.cveDescription}
                </p>
              </div>
            ) : null}
            <DetailList
              items={[
                { label: "CVE", value: finding.cve_id || "—" },
                { label: "CWE", value: finding.cwe_ids || "—" },
                { label: "Vulnerability type", value: finding.type_display_name || "—" },
              ]}
            />
          </div>
        </Section>

        <Section title="Affected Asset / Scope">
          <DetailList
            items={[
              { label: "Affected asset", value: assetLabel },
              { label: "Asset ID", value: origin?.assetId || "—" },
              { label: "Target count", value: finding.target_count?.toLocaleString() || "—" },
              { label: "Business-service context", value: businessContext || "—" },
            ]}
          />
        </Section>

        {finding.isKev ? (
          <Section title="Threat Context">
            <DetailList
              items={[
                { label: "KEV flag", value: "Yes" },
                { label: "Due date", value: formatDate(finding.kevDueDate) },
                { label: "Ransomware use", value: finding.kevRansomwareUse || "—" },
                { label: "Required action", value: finding.kevRequiredAction || "—" },
                {
                  label: "Short description",
                  value: finding.kevShortDescription || finding.kevVulnerabilityName || "—",
                },
              ]}
            />
          </Section>
        ) : null}

        <Section title="Identifiers & Source">
          <DetailList
            items={[
              { label: "Internal finding row ID", value: finding.id },
              { label: "Source finding ID", value: finding.record_id || "—" },
              { label: "Source UID", value: finding.uid || "—" },
              { label: "CVE", value: finding.cve_id || "—" },
              { label: "Record link", value: renderLink(finding.record_link) },
              { label: "Source", value: finding.source || "—" },
            ]}
          />
        </Section>

        <Section title="Scoring Details">
          <DetailList items={scoringItems} />
        </Section>
      </div>
    </div>
  );
}
