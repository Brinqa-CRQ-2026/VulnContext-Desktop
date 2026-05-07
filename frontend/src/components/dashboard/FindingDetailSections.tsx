import type { ReactNode } from "react";

import type { FindingRouteOrigin, ScoredFinding } from "../../types";
import { formatAgeDays, formatDate } from "../../lib/formatting/dates";
import { formatNumber } from "../../lib/formatting/numbers";
import { isPopulatedText, joinDisplayText } from "../../lib/formatting/text";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export { formatDate } from "../../lib/formatting/dates";
export { formatNumber } from "../../lib/formatting/numbers";
export {
  isPopulatedText as isPopulated,
  joinDisplayText as joinText,
} from "../../lib/formatting/text";

export function formatAge(value?: number | null) {
  return formatAgeDays(value);
}

export function FindingOverviewSection({
  finding,
  recommendationText,
  hasDistinctCveDescription,
}: {
  finding: ScoredFinding;
  recommendationText: string | null;
  hasDistinctCveDescription: boolean;
}) {
  return (
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
            { label: "Severity", value: finding.severity || finding.cvss_severity || "-" },
            { label: "Attack vector", value: finding.attack_vector || "-" },
            { label: "Attack complexity", value: finding.attack_complexity || "-" },
          ]}
          className="sm:grid-cols-2 xl:grid-cols-3"
        />
      </div>
    </Section>
  );
}

export function FindingRemediationSection({
  finding,
  recommendationText,
  hasRemediationSnapshot,
  dueDateValue,
}: {
  finding: ScoredFinding;
  recommendationText: string | null;
  hasRemediationSnapshot: boolean;
  dueDateValue?: string | null;
}) {
  return (
    <Section title="Remediation" compact>
      <div className="grid gap-4">
        {finding.isKev ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Known Exploited Vulnerability
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-900">
                  {finding.kevShortDescription
                    || finding.kevVulnerabilityName
                    || "This finding is present in the KEV catalog."}
                </p>
              </div>
              <div className="min-w-[11rem] rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  KEV due date
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDate(finding.kevDueDate)}
                </div>
                <div className="mt-2 text-xs text-slate-600">
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
                  { label: "Due date", value: formatDate(dueDateValue) },
                  {
                    label: "Remediation owner",
                    value: finding.remediation_owner_name || finding.risk_owner_name || "-",
                  },
                  { label: "Remediation status", value: finding.remediation_status || "-" },
                  {
                    label: "Urgency",
                    value: dueDateValue ? `Due ${formatDate(dueDateValue)}` : formatAgeDays(finding.age_in_days),
                  },
                ]}
              />
            </div>
          </div>
        ) : null}

        <CompactDetailList
          items={[
            { label: "Remediation owner", value: finding.remediation_owner_name || "-" },
            { label: "Risk owner", value: finding.risk_owner_name || "-" },
            { label: "Remediation status", value: finding.remediation_status || "-" },
            { label: "Due date", value: formatDate(dueDateValue) },
          ]}
        />
      </div>
    </Section>
  );
}

export function FindingAffectedContextSection({
  finding,
  origin,
  assetLabel,
  businessContext,
}: {
  finding: ScoredFinding;
  origin?: FindingRouteOrigin | null;
  assetLabel: string;
  businessContext: string;
}) {
  return (
    <Section title="Affected Asset & Business Context" compact>
      <CompactDetailList
        items={[
          { label: "Affected asset", value: assetLabel },
          { label: "Asset ID", value: origin?.assetId || finding.asset_id || "-" },
          { label: "Target ID", value: finding.target_ids || finding.asset_id || "-" },
          { label: "Target names", value: finding.target_names || "-" },
          { label: "Business context", value: businessContext || "-" },
          { label: "Asset criticality", value: formatNumber(finding.asset_criticality) },
          { label: "Risk owner", value: finding.risk_owner_name || "-" },
        ]}
      />
    </Section>
  );
}

export function FindingSupportingDetailsSection({
  finding,
  hasAttackContext,
}: {
  finding: ScoredFinding;
  hasAttackContext: boolean;
}) {
  const identifierItems = [
    { label: "Internal finding row ID", value: finding.id },
    { label: "CVE", value: finding.cve_id || "-" },
  ].concat(
    finding.uid && finding.uid !== finding.id ? [{ label: "Source UID", value: finding.uid }] : [],
    isPopulatedText(finding.cwe_ids) ? [{ label: "CWE", value: finding.cwe_ids || "-" }] : [],
    finding.record_link ? [{ label: "Record link", value: renderLink(finding.record_link) }] : [],
    finding.detail_fetched_at
      ? [
          {
            label: "Detail fetched",
            value: formatDate(finding.detail_fetched_at, true),
          },
        ]
      : []
  );
  const scoringItems = [
    { label: "Display risk source", value: finding.score_source || "Vendor fallback" },
    {
      label: "CRQ score version / timestamp",
      value: joinDisplayText([finding.crq_score_version, formatDate(finding.crq_scored_at, true)], "-"),
    },
    {
      label: "Vendor risk score / band / rating",
      value: joinDisplayText(
        [formatNumber(finding.source_risk_score), finding.source_risk_band, finding.source_risk_rating],
        "-"
      ),
    },
    { label: "CRQ score", value: formatNumber(finding.risk_score) },
    { label: "Base risk score", value: formatNumber(finding.base_risk_score) },
    {
      label: "CRQ modifiers",
      value: joinDisplayText(
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
        "-"
      ),
    },
    { label: "CRQ notes", value: finding.crq_notes || "-" },
  ];

  return (
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
                  { label: "Attack pattern", value: finding.attack_pattern_names || "-" },
                  { label: "Attack technique", value: finding.attack_technique_names || "-" },
                  { label: "Attack tactic", value: finding.attack_tactic_names || "-" },
                ]}
              />
            </div>
          </TabsContent>
        ) : null}
      </Tabs>

      {finding.isKev ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-950">KEV Details</div>
          <CompactDetailList
            columns={1}
            items={[
              { label: "KEV date added", value: formatDate(finding.kevDateAdded) },
              { label: "KEV due date", value: formatDate(finding.kevDueDate) },
              { label: "Ransomware use", value: finding.kevRansomwareUse || "-" },
              {
                label: "KEV vendor / project",
                value: joinDisplayText([finding.kevVendorProject, finding.kevProduct], "-"),
              },
            ]}
          />
        </div>
      ) : null}
    </Section>
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
        {isPopulatedText(value) ? value : placeholder}
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
  if (!isPopulatedText(value)) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{value}</div>
    </div>
  );
}

function renderLink(value?: string | null) {
  if (!isPopulatedText(value)) return "-";
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
