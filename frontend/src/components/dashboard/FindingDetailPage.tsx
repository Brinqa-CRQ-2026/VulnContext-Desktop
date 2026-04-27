import type { ReactNode } from "react";

import type { FindingRouteOrigin, ScoredFinding } from "../../api";
import type { BreadcrumbEntry } from "../business-services/TopologyChrome";
import { TopologyBreadcrumbs } from "../business-services/TopologyChrome";
import { useFindingDetails } from "../../hooks/findings/useFindingDetails";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

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

function joinText(values: Array<string | null | undefined>, fallback = "—") {
  return values.filter((value) => isPopulated(value ?? null)).join(" • ") || fallback;
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
  compact = false,
}: {
  title: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Card>
      <CardHeader className={compact ? "pb-2" : "pb-3"}>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DetailList({
  items,
  className = "sm:grid-cols-2",
}: {
  items: Array<{ label: string; value: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={`grid gap-3 ${className}`}>
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

function CompactDetailList({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  columns?: 1 | 2;
}) {
  const gridClass = columns === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";

  return (
    <dl className={`grid gap-x-6 gap-y-3 ${gridClass}`}>
      {items.map((item) => (
        <div key={item.label} className="border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {item.label}
          </dt>
          <dd className="mt-1 break-words text-sm text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function NarrativeBlock({
  label,
  value,
  placeholder,
  emphasized = false,
}: {
  label: string;
  value?: string | null;
  placeholder: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        emphasized ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50/70"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
        {isPopulated(value) ? value : placeholder}
      </div>
    </div>
  );
}

function InlineNarrative({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!isPopulated(value)) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{value}</div>
    </div>
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
  const raw = (finding.display_name || "").trim();
  const cve = (finding.cve_id || "").trim().toUpperCase();

  if (!raw) {
    return cve || "Finding";
  }
  if (!cve) {
    return raw;
  }

  const suffixPattern = new RegExp(`:\\s*${cve}$`, "i");
  const exactPattern = new RegExp(`^${cve}$`, "i");

  if (suffixPattern.test(raw)) {
    const stripped = raw.replace(suffixPattern, "").trim();
    if (stripped) return stripped;
  }
  if (exactPattern.test(raw)) {
    return cve;
  }

  return raw;
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
              <p className="mt-1 text-sm text-rose-600">{error || "Finding not found."}</p>
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
  const subtitle = joinText(
    [assetLabel !== "—" ? assetLabel : null, businessContext || null, finding.source || null],
    finding.source || "Finding detail"
  );
  const hasDistinctCveDescription =
    isPopulated(finding.cveDescription) && finding.cveDescription?.trim() !== finding.description?.trim();
  const displayedStatus = finding.status || finding.lifecycle_status || null;
  const recommendationText =
    finding.remediation_plan || finding.remediation_summary || null;
  const hasRemediationSnapshot = Boolean(
    recommendationText
      || isPopulated(finding.kevRequiredAction)
      || isPopulated(finding.remediation_owner_name)
      || isPopulated(finding.remediation_status)
      || isPopulated(finding.remediation_notes)
      || finding.due_date
      || finding.remediation_due_date
      || finding.kevDueDate
  );
  const hasAttackContext = Boolean(
    isPopulated(finding.attack_pattern_names)
      || isPopulated(finding.attack_technique_names)
      || isPopulated(finding.attack_tactic_names)
      || isPopulated(finding.confidence)
  );
  const dueDateValue = finding.due_date || finding.remediation_due_date || finding.kevDueDate;
  const identifierItems = [
    { label: "Internal finding row ID", value: finding.id },
    { label: "CVE", value: finding.cve_id || "—" },
  ].concat(
    finding.uid && finding.uid !== finding.id ? [{ label: "Source UID", value: finding.uid }] : [],
    isPopulated(finding.cwe_ids) ? [{ label: "CWE", value: finding.cwe_ids || "—" }] : [],
    finding.record_link ? [{ label: "Record link", value: renderLink(finding.record_link) }] : [],
    finding.last_updated || finding.date_created
      ? [
          {
            label: "Created / updated",
            value: joinText([formatDate(finding.date_created, true), formatDate(finding.last_updated, true)], "—"),
          },
        ]
      : []
  );
  const scoringItems = [
    { label: "Display risk source", value: finding.score_source || "Vendor fallback" },
    {
      label: "CRQ score version / timestamp",
      value: joinText([finding.crq_score_version, formatDate(finding.crq_scored_at, true)], "—"),
    },
    {
      label: "Vendor risk score / band / rating",
      value: joinText(
        [formatNumber(finding.source_risk_score), finding.source_risk_band, finding.source_risk_rating],
        "—"
      ),
    },
    {
      label: "Internal risk score / band",
      value: joinText([formatNumber(finding.internal_risk_score), finding.internal_risk_band], "—"),
    },
    { label: "Base risk score", value: formatNumber(finding.base_risk_score) },
    {
      label: "CRQ modifiers",
      value: joinText(
        [
          finding.crq_kev_bonus !== null && finding.crq_kev_bonus !== undefined
            ? `KEV bonus ${formatNumber(finding.crq_kev_bonus)}`
            : null,
          finding.crq_age_bonus !== null && finding.crq_age_bonus !== undefined
            ? `Age bonus ${formatNumber(finding.crq_age_bonus)}`
            : null,
          finding.crq_epss_multiplier !== null && finding.crq_epss_multiplier !== undefined
            ? `EPSS multiplier ${formatNumber(finding.crq_epss_multiplier)}`
            : null,
        ],
        "—"
      ),
    },
    { label: "CRQ notes", value: finding.crq_notes || "—" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="gap-5 pb-4">
          <TopologyBreadcrumbs items={breadcrumbs} />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{finding.source || "Unknown source"}</Badge>
                <Badge kind="band" value={finding.risk_band}>
                  {`${finding.risk_band || "Unrated"} • ${formatNumber(finding.risk_score)}`}
                </Badge>
                {finding.cve_id ? <Badge>{finding.cve_id}</Badge> : null}
                {displayedStatus ? <Badge>{displayedStatus}</Badge> : null}
                {finding.isKev ? <Badge kind="warn">KEV</Badge> : null}
              </div>
              <CardTitle className="mt-3 break-words text-xl">{title}</CardTitle>
              <p className="mt-2 break-words text-sm text-slate-500">{subtitle}</p>
            </div>
            <Button size="sm" variant="outline" onClick={onBack}>
              {backLabel}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {finding.isKev || hasRemediationSnapshot ? (
            <div className="space-y-3">
            {finding.isKev ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Known Exploited Vulnerability
                    </div>
                    <p className="mt-2 text-sm leading-6 text-amber-950">
                      {finding.kevShortDescription
                        || finding.kevVulnerabilityName
                        || "This finding is present in the KEV catalog."}
                    </p>
                  </div>
                  <div className="min-w-[11rem] rounded-lg border border-amber-200 bg-white/80 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                      KEV due date
                    </div>
                    <div className="mt-1 text-sm font-semibold text-amber-950">
                      {formatDate(finding.kevDueDate)}
                    </div>
                    <div className="mt-2 text-xs text-amber-800">
                      {finding.kevRequiredAction || "Review KEV-required action as soon as possible."}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {hasRemediationSnapshot ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Action Snapshot
                </div>
                <div className="mt-3 grid gap-3">
                  {recommendationText ? (
                    <InlineNarrative label="Recommendation" value={recommendationText} />
                  ) : null}
                  {finding.kevRequiredAction ? (
                    <InlineNarrative label="Required action" value={finding.kevRequiredAction} />
                  ) : null}
                  <CompactDetailList
                    items={[
                      {
                        label: "Due date",
                        value: formatDate(dueDateValue),
                      },
                      {
                        label: "Remediation owner",
                        value: finding.remediation_owner_name || finding.risk_owner_name || "—",
                      },
                      {
                        label: "Remediation status",
                        value: finding.remediation_status || "—",
                      },
                      {
                        label: "Urgency",
                        value: dueDateValue ? `Due ${formatDate(dueDateValue)}` : formatAge(finding.age_in_days),
                      },
                    ]}
                  />
                </div>
              </div>
            ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 xl:grid-cols-5">
            <SummaryStat
              label="Display risk"
              value={formatNumber(finding.risk_score)}
              hint={finding.risk_band || "Unrated"}
            />
            <SummaryStat
              label="Vendor risk"
              value={formatNumber(finding.source_risk_score)}
              hint={joinText([finding.source_risk_rating, finding.source_risk_band], "Unspecified")}
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
            <SummaryStat
              label={dueDateValue ? "Due date" : "Age"}
              value={dueDateValue ? formatDate(dueDateValue) : formatAge(finding.age_in_days)}
              hint={assetLabel !== "—" ? assetLabel : undefined}
            />
          </div>
        </CardContent>
      </Card>

      <Section title="Finding Overview">
        <div className="grid gap-4">
          <NarrativeBlock
            label="Primary Description"
            value={finding.description || finding.summary}
            placeholder="No description is available for this finding."
            emphasized
          />
          {recommendationText ? (
            <NarrativeBlock
              label="Recommendation"
              value={recommendationText}
              placeholder=""
            />
          ) : null}
          {hasDistinctCveDescription ? (
            <NarrativeBlock
              label="CVE Description"
              value={finding.cveDescription}
              placeholder="No separate CVE description is available."
            />
          ) : null}
          <DetailList
            items={[
              { label: "Vulnerability type", value: finding.type_display_name || "—" },
              { label: "Severity", value: finding.severity || finding.cvss_severity || "—" },
              { label: "Attack vector", value: finding.attack_vector || "—" },
              { label: "Attack complexity", value: finding.attack_complexity || "—" },
            ]}
            className="sm:grid-cols-2 xl:grid-cols-4"
          />
        </div>
      </Section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Section title="Remediation" compact>
              <div className="grid gap-4">
                {finding.remediation_notes ? (
                  <InlineNarrative label="Remediation notes" value={finding.remediation_notes} />
                ) : null}
                <CompactDetailList
                  items={[
                    { label: "Remediation owner", value: finding.remediation_owner_name || "—" },
                    { label: "Risk owner", value: finding.risk_owner_name || "—" },
                    { label: "Remediation status", value: finding.remediation_status || "—" },
                    { label: "Remediation due date", value: formatDate(finding.remediation_due_date) },
                    {
                      label: "Last remediation update",
                      value: joinText(
                        [formatDate(finding.remediation_updated_at, true), finding.remediation_updated_by],
                        "—"
                      ),
                    },
                  ]}
                />
              </div>
            </Section>

            <Section title="Affected Asset & Business Context" compact>
              <CompactDetailList
                items={[
                  { label: "Affected asset", value: assetLabel },
                  { label: "Asset ID", value: origin?.assetId || "—" },
                  { label: "Target count", value: finding.target_count?.toLocaleString() || "—" },
                  { label: "Target names", value: finding.target_names || "—" },
                  { label: "Business context", value: businessContext || "—" },
                  { label: "Asset criticality", value: formatNumber(finding.asset_criticality) },
                  { label: "Context score", value: formatNumber(finding.context_score) },
                  { label: "Risk owner", value: finding.risk_owner_name || "—" },
                ]}
              />
            </Section>
          </div>

          {finding.isKev ? (
            <Section title="KEV Details" compact>
              <CompactDetailList
                items={[
                  { label: "KEV date added", value: formatDate(finding.kevDateAdded) },
                  { label: "KEV due date", value: formatDate(finding.kevDueDate) },
                  { label: "Ransomware use", value: finding.kevRansomwareUse || "—" },
                  {
                    label: "KEV vendor / project",
                    value: joinText([finding.kevVendorProject, finding.kevProduct], "—"),
                  },
                ]}
              />
            </Section>
          ) : null}
        </div>

        <Section title="Supporting Details" compact>
          <Tabs defaultValue="identifiers">
            <TabsList>
              <TabsTrigger value="identifiers">Identifiers</TabsTrigger>
              <TabsTrigger value="scoring">Scoring</TabsTrigger>
              {hasAttackContext ? <TabsTrigger value="attack">Attack</TabsTrigger> : null}
            </TabsList>

            <TabsContent value="identifiers">
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                <CompactDetailList items={identifierItems} columns={1} />
              </div>
            </TabsContent>

            <TabsContent value="scoring">
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                <CompactDetailList items={scoringItems} columns={1} />
              </div>
            </TabsContent>

            {hasAttackContext ? (
              <TabsContent value="attack">
                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                  <CompactDetailList
                    columns={1}
                    items={[
                      { label: "Attack pattern", value: finding.attack_pattern_names || "—" },
                      { label: "Attack technique", value: finding.attack_technique_names || "—" },
                      { label: "Attack tactic", value: finding.attack_tactic_names || "—" },
                      { label: "Confidence", value: finding.confidence || "—" },
                    ]}
                  />
                </div>
              </TabsContent>
            ) : null}
          </Tabs>
        </Section>
      </div>
    </div>
  );
}
