import type { ReactNode } from "react";

import type { FindingRouteOrigin, NvdReference, ScoredFinding } from "../../types";
import { formatAgeDays, formatDate } from "../../lib/formatting/dates";
import { formatNumber } from "../../lib/formatting/numbers";
import { isPopulatedText, joinDisplayText } from "../../lib/formatting/text";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { openExternalUrl } from "../../lib/externalUrls";

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
}: {
  finding: ScoredFinding;
  recommendationText: string | null;
}) {
  return (
    <Section title="Finding Overview">
      <div className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] xl:items-stretch">
          <DescriptionRecommendationBlock
            description={finding.cveDescription || finding.description || finding.summary}
            recommendation={recommendationText}
            remediationReference={getBestRemediationReference(finding)}
          />
          <div className="grid gap-4">
            <CveIntelligenceCard finding={finding} />
            <KevIntelligenceCard finding={finding} />
          </div>
        </div>
        <VulnerabilityType
          cweId={finding.primary_cwe_id}
          cweDescription={finding.primary_cwe_description}
        />
        <CvssVectorTable finding={finding} />
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
    <Section title="Details" compact>
      <Tabs defaultValue="asset-business-context">
        <TabsList>
          <TabsTrigger value="asset-business-context">Asset &amp; Business Context</TabsTrigger>
        </TabsList>

        <TabsContent value="asset-business-context">
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
            <CompactDetailList
              columns={1}
              items={[
                { label: "Affected asset", value: assetLabel },
                { label: "Asset ID", value: origin?.assetId || finding.asset_id || "-" },
                { label: "Target ID", value: finding.target_ids || finding.asset_id || "-" },
                { label: "Target names", value: finding.target_names || "-" },
                { label: "Business context", value: businessContext || "-" },
                { label: "Asset criticality", value: formatNumber(finding.asset_criticality) },
              ]}
            />
          </div>
        </TabsContent>
      </Tabs>
    </Section>
  );
}

export function FindingSupportingDetailsSection({
  finding,
  hasAttackContext,
  origin,
  assetLabel,
  businessContext,
}: {
  finding: ScoredFinding;
  hasAttackContext: boolean;
  origin?: FindingRouteOrigin | null;
  assetLabel: string;
  businessContext: string;
}) {
  const identifierItems: Array<{ label: string; value: ReactNode }> = [
    { label: "Internal finding row ID", value: finding.id },
    { label: "CVE", value: finding.cve_id || "-" },
  ];

  if (finding.uid && finding.uid !== finding.id) {
    identifierItems.push({ label: "Source UID", value: finding.uid });
  }
  if (isPopulatedText(finding.cwe_ids)) {
    identifierItems.push({ label: "CWE", value: finding.cwe_ids || "-" });
  }
  if (finding.record_link) {
    identifierItems.push({ label: "Record link", value: renderLink(finding.record_link) });
  }
  if (finding.detail_fetched_at) {
    identifierItems.push({
      label: "Detail fetched",
      value: formatDate(finding.detail_fetched_at, true),
    });
  }
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
    <Section title="Supporting Details" compact className="h-full w-[544px] max-w-full">
      <Tabs defaultValue="identifiers">
        <TabsList>
          <TabsTrigger value="identifiers">Identifiers</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="asset-business-context">Asset &amp; Business Context</TabsTrigger>
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

        <TabsContent value="asset-business-context">
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
            <CompactDetailList
              columns={1}
              items={[
                { label: "Affected asset", value: assetLabel },
                { label: "Asset ID", value: origin?.assetId || finding.asset_id || "-" },
                { label: "Target ID", value: finding.target_ids || finding.asset_id || "-" },
                { label: "Target names", value: finding.target_names || "-" },
                { label: "Business context", value: businessContext || "-" },
                { label: "Asset criticality", value: formatNumber(finding.asset_criticality) },
              ]}
            />
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

    </Section>
  );
}

function Section({
  title,
  children,
  compact = false,
  className,
}: {
  title: string;
  children: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
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

function VulnerabilityType({
  cweId,
  cweDescription,
}: {
  cweId?: string | null;
  cweDescription?: string | null;
}) {
  const hasCweId = isPopulatedText(cweId);
  const hasCweDescription = isPopulatedText(cweDescription);

  return (
    <div className="mt-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Vulnerability Type
      </div>
      <div className="mt-1 text-sm text-slate-900">
        {hasCweId || hasCweDescription ? (
          <>
            <div className="font-semibold">{hasCweId ? cweId : "-"}</div>
            <div className="mt-0.5 text-slate-700">{hasCweDescription ? cweDescription : "-"}</div>
          </>
        ) : (
          "-"
        )}
      </div>
    </div>
  );
}

function CvssVectorTable({ finding }: { finding: ScoredFinding }) {
  const items = [
    { label: "Attack Vector", value: formatCvssMetric(finding.attack_vector) },
    { label: "Attack Complexity", value: formatCvssMetric(finding.attack_complexity) },
    { label: "Privileges Required", value: formatCvssMetric(finding.privileges_required) },
    { label: "User Interaction", value: formatCvssMetric(finding.user_interaction) },
    { label: "Confidentiality Impact", value: formatCvssMetric(finding.confidentiality_impact) },
    { label: "Integrity Impact", value: formatCvssMetric(finding.integrity_impact) },
    { label: "Availability Impact", value: formatCvssMetric(finding.availability_impact) },
    { label: "Scope", value: formatCvssMetric(finding.scope) },
  ];

  return (
    <div className="rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {items.map((item, index) => (
              <TableHead
                key={item.label}
                aria-label={item.label}
                className={`min-w-[8.25rem] border-slate-200 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 ${
                  index > 0 ? "border-l" : ""
                }`}
              >
                <StackedHeader label={item.label} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="hover:bg-transparent">
            {items.map((item, index) => (
              <TableCell
                key={item.label}
                className={`border-slate-200 px-3 py-3 text-sm text-slate-900 ${
                  index > 0 ? "border-l" : ""
                }`}
              >
                {item.value}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function StackedHeader({ label }: { label: string }) {
  const words = label.split(" ");

  return (
    <span className="flex flex-col leading-4" aria-hidden="true">
      {words.map((word) => (
        <span key={word}>{word}</span>
      ))}
    </span>
  );
}

function DescriptionRecommendationBlock({
  description,
  recommendation,
  remediationReference,
}: {
  description?: string | null;
  recommendation?: string | null;
  remediationReference?: NvdReference | null;
}) {
  return (
    <div className="h-full rounded-lg border border-slate-200 bg-white">
      <div className="p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Description
        </div>
        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
          {isPopulatedText(description) ? description : "No CVE description is available for this finding."}
        </div>
      </div>
      <div className="border-t border-slate-200 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Recommendation
        </div>
        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
          {isPopulatedText(recommendation)
            ? recommendation
            : "No recommendation is available for this finding."}
        </div>
        {remediationReference?.url ? (
          <div className="mt-3">
            <Button asChild variant="outline" size="sm">
              <a
                href={remediationReference.url}
                onClick={async (event) => {
                  event.preventDefault();
                  await openExternalUrl(remediationReference.url);
                }}
                target="_blank"
                rel="noreferrer"
              >
                Open remediation reference
              </a>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getBestRemediationReference(finding: ScoredFinding): NvdReference | null {
  const grouped = finding.reference_groups || {};
  const orderedGroups = [
    "Patch / Release Notes",
    "Vendor Advisory",
    "Technical Analysis",
    "NVD / CVE Record",
  ];

  for (const groupName of orderedGroups) {
    const picked = pickBestReference(grouped[groupName], groupName);
    if (picked) return picked;
  }

  const fallback = (finding.references || []).find((reference) => isPopulatedText(reference?.url));
  return fallback || null;
}

function pickBestReference(references?: NvdReference[] | null, groupName?: string) {
  if (!references || references.length === 0) return null;

  return [...references].sort((left, right) => remediationReferenceScore(right, groupName) - remediationReferenceScore(left, groupName))[0] || null;
}

function remediationReferenceScore(reference: NvdReference, groupName?: string) {
  const haystack = [
    groupName,
    reference.group,
    reference.source,
    ...(reference.tags || []),
    reference.url,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;

  if (haystack.includes("patch")) score += 100;
  if (haystack.includes("release note")) score += 95;
  if (haystack.includes("vendor advisory") || haystack.includes("vendor")) score += 75;
  if (haystack.includes("technical analysis") || haystack.includes("analysis")) score += 50;
  if (haystack.includes("nvd") || haystack.includes("cve")) score += 25;
  if (haystack.includes("third party")) score += 10;
  if (haystack.includes("exploit") || haystack.includes("poc")) score -= 50;

  return score;
}

function CveIntelligenceCard({ finding }: { finding: ScoredFinding }) {
  const items = [
    { label: "NVD Status", value: formatCvssMetric(finding.nvd_vuln_status) },
    { label: "Published", value: formatDate(finding.nvd_published) },
    { label: "Last Modified", value: formatDate(finding.nvd_last_modified) },
    { label: "CVSS Version", value: finding.cvss_version || "-" },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        CVE Intelligence
      </div>
      <dl className="mt-3 divide-y divide-slate-200">
        {items.map((item) => (
          <div key={item.label} className="grid gap-2 py-2 first:pt-0 last:pb-0 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
            <dt className="text-sm font-medium text-slate-600">{item.label}</dt>
            <dd className="break-words text-sm text-slate-900">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function KevIntelligenceCard({ finding }: { finding: ScoredFinding }) {
  const vulnerabilityName =
    finding.cisa_vulnerability_name || finding.kevVulnerabilityName || finding.kevShortDescription;
  const exploitAdd = finding.cisa_exploit_add || finding.kevDateAdded;
  const actionDue = finding.cisa_action_due || finding.kevDueDate;

  if (!vulnerabilityName && !exploitAdd && !actionDue) {
    return null;
  }

  const items = [
    { label: "Name", value: vulnerabilityName || "-" },
    { label: "Added to KEV", value: formatDate(exploitAdd) },
    { label: "Action Due", value: formatDate(actionDue) },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        CISA Known Exploited Vulnerability
      </div>
      <dl className="mt-3 divide-y divide-slate-200">
        {items.map((item) => (
          <div key={item.label} className="grid gap-2 py-2 first:pt-0 last:pb-0 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
            <dt className="text-sm font-medium text-slate-600">{item.label}</dt>
            <dd className="break-words text-sm text-slate-900">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatCvssMetric(value?: string | null) {
  if (!isPopulatedText(value)) return "-";

  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderLink(value?: string | null) {
  if (!isPopulatedText(value)) return "-";
  return (
    <a
      className="text-sky-700 underline underline-offset-2"
      href={value ?? undefined}
      onClick={async (event) => {
        event.preventDefault();
        await openExternalUrl(value);
      }}
      target="_blank"
      rel="noreferrer"
    >
      {value}
    </a>
  );
}
