import { useCallback, type ReactNode } from "react";

import { predictFindingFairLoss } from "../../api/findings";
import type { FindingRouteOrigin, ScoredFinding } from "../../types";
import type { BreadcrumbEntry } from "../business-services/TopologyChrome";
import { useFindingDetails } from "../../hooks/findings/useFindingDetails";
import { FairFrequencyPanel } from "../fair/FairFrequencyPanel";
import { EntityHero } from "../business-services/shared/EntityHero";
import { MetricCard, MetricGrid } from "../business-services/shared/MetricCard";
import { StatusBadge } from "../business-services/shared/TopologyBadges";
import {
  FindingAffectedContextSection,
  FindingOverviewSection,
  FindingRemediationSection,
  FindingSupportingDetailsSection,
  formatAge,
  formatNumber,
  isPopulated,
  joinText,
} from "./FindingDetailSections";

interface FindingDetailPageProps {
  findingId: string;
  refreshToken: number;
  origin?: FindingRouteOrigin | null;
  breadcrumbs: BreadcrumbEntry[];
  backLabel: string;
  onBack: () => void;
  onDataChanged?: () => void;
}

function formatStatus(finding: ScoredFinding) {
  return [finding.status, finding.lifecycle_status].filter(Boolean).join(" / ") || null;
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

function getAssetLabel(finding: ScoredFinding, origin?: FindingRouteOrigin | null): string {
  if (origin?.assetLabel) return origin.assetLabel;
  if (isPopulated(finding.target_names)) return finding.target_names ?? "-";
  return "-";
}

function LoadingState({
  breadcrumbs,
  backLabel,
  onBack,
}: {
  breadcrumbs: BreadcrumbEntry[];
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <EntityHero
      breadcrumbs={breadcrumbs}
      label="Finding"
      title="Loading finding"
      backLabel={backLabel}
      onBack={onBack}
    />
  );
}

function ErrorState({
  breadcrumbs,
  backLabel,
  onBack,
  message,
}: {
  breadcrumbs: BreadcrumbEntry[];
  backLabel: string;
  onBack: () => void;
  message: string;
}) {
  return (
    <EntityHero
      breadcrumbs={breadcrumbs}
      label="Finding"
      title="Finding not available"
      metadata={<span className="text-rose-600">{message}</span>}
      backLabel={backLabel}
      onBack={onBack}
    />
  );
}

function HeroTags({ finding }: { finding: ScoredFinding }) {
  const displayedStatus = formatStatus(finding);
  const tags: ReactNode[] = [
    <StatusBadge key="source" tone="neutral">
      Source: {finding.source || "Unknown source"}
    </StatusBadge>,
    <StatusBadge key="risk" tone={finding.risk_band || "neutral"}>
      {finding.risk_band || "Unrated"} / {formatNumber(finding.risk_score)}
    </StatusBadge>,
  ];

  if (finding.cve_id) {
    tags.push(
      <StatusBadge key="cve" tone="neutral">
        CVE: {finding.cve_id}
      </StatusBadge>
    );
  }
  if (displayedStatus) {
    tags.push(
      <StatusBadge key="status" tone="neutral">
        Status: {displayedStatus}
      </StatusBadge>
    );
  }
  if (finding.isKev) {
    tags.push(
      <StatusBadge key="kev" tone="warn">
        KEV
      </StatusBadge>
    );
  }

  return <div className="flex flex-wrap items-center justify-end gap-2">{tags}</div>;
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
  const predictFairFrequency = useCallback(
    (payload: Parameters<typeof predictFindingFairLoss>[1]) =>
      predictFindingFairLoss(findingId, payload),
    [findingId]
  );

  if (loading) {
    return (
      <LoadingState
        breadcrumbs={breadcrumbs}
        backLabel={backLabel}
        onBack={onBack}
      />
    );
  }

  if (error || !finding) {
    return (
      <ErrorState
        breadcrumbs={breadcrumbs}
        backLabel={backLabel}
        onBack={onBack}
        message={error || "Finding not found."}
      />
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
    [assetLabel !== "-" ? assetLabel : null, businessContext || null, finding.source || null],
    finding.source || "Finding detail"
  );
  const recommendationText = finding.kevRequiredAction || null;
  const hasDistinctCveDescription =
    isPopulated(finding.cveDescription) &&
    finding.cveDescription?.trim() !== finding.description?.trim();
  const dueDateValue = finding.due_date || finding.kevDueDate;
  const hasRemediationSnapshot = Boolean(
    recommendationText
      || isPopulated(finding.kevRequiredAction)
      || isPopulated(finding.remediation_owner_name)
      || isPopulated(finding.remediation_status)
      || finding.due_date
      || finding.kevDueDate
  );
  const hasAttackContext = Boolean(
    isPopulated(finding.attack_pattern_names)
      || isPopulated(finding.attack_technique_names)
      || isPopulated(finding.attack_tactic_names)
  );

  return (
    <div className="flex flex-col gap-5">
      <EntityHero
        breadcrumbs={breadcrumbs}
        label="Finding"
        title={title}
        metadata={subtitle}
        tags={<HeroTags finding={finding} />}
        backLabel={backLabel}
        onBack={onBack}
      />

      <MetricGrid className="sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Display Risk"
          value={formatNumber(finding.risk_score)}
          hint={finding.risk_band || "Unrated"}
        />
        <MetricCard
          label="Vendor Risk"
          value={formatNumber(finding.source_risk_score)}
          hint={joinText([finding.source_risk_rating, finding.source_risk_band], "Unspecified")}
        />
        <MetricCard
          label="CVSS"
          value={formatNumber(finding.cvss_score)}
          hint={finding.cvss_severity || "Unspecified"}
        />
        <MetricCard
          label="EPSS"
          value={formatNumber(finding.epss_score, 4)}
          hint={`Percentile ${formatNumber(finding.epss_percentile, 4)}`}
        />
        <MetricCard
          label="Age"
          value={formatAge(finding.age_in_days)}
          hint={assetLabel !== "-" ? assetLabel : undefined}
        />
      </MetricGrid>

      <FairFrequencyPanel
        title="Finding FAIR Event Frequency"
        description="Shows likelihood indicators for this finding without assigning dollar loss at the finding level."
        scopeLabel="finding"
        onPredict={predictFairFrequency}
      />

      <FindingOverviewSection
        finding={finding}
        recommendationText={recommendationText}
        hasDistinctCveDescription={hasDistinctCveDescription}
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <FindingRemediationSection
          finding={finding}
          recommendationText={recommendationText}
          hasRemediationSnapshot={hasRemediationSnapshot}
          dueDateValue={dueDateValue}
        />
        <FindingAffectedContextSection
          finding={finding}
          origin={origin}
          assetLabel={assetLabel}
          businessContext={businessContext}
        />
      </div>

      <FindingSupportingDetailsSection
        finding={finding}
        hasAttackContext={hasAttackContext}
      />
    </div>
  );
}
