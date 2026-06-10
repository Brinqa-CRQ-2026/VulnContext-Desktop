import { useCallback } from "react";
import { Info } from "lucide-react";

import { predictFindingFairLoss } from "../../api/findings";
import type { FindingRouteOrigin, ScoredFinding } from "../../types";
import type { BreadcrumbEntry } from "../business-services/TopologyChrome";
import { useFindingDetails } from "../../hooks/findings/useFindingDetails";
import { FairFrequencyPanel } from "../fair/FairFrequencyPanel";
import { EntityHero } from "../business-services/shared/EntityHero";
import { MetricCard, MetricGrid } from "../business-services/shared/MetricCard";
import { StatusBadge } from "../business-services/shared/TopologyBadges";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";
import {
  FindingOverviewSection,
  FindingSupportingDetailsSection,
  formatAge,
  formatNumber,
  isPopulated,
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

function isActiveFinding(finding: ScoredFinding) {
  const statusText = [finding.status, finding.lifecycle_status]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(closed|complete|completed|fixed|inactive|resolved|remediated)\b/.test(statusText)) {
    return false;
  }

  return true;
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
      showBackButton={false}
      showIdentityBadge={false}
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
      showBackButton={false}
      showIdentityBadge={false}
      onBack={onBack}
    />
  );
}

function HeroTags({ finding }: { finding: ScoredFinding }) {
  const active = isActiveFinding(finding);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <StatusBadge tone={active ? "active" : "neutral"}>
        {active ? "Active" : "Inactive"}
      </StatusBadge>
    </div>
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
  const recommendationText = finding.kevRequiredAction || null;
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
        tags={<HeroTags finding={finding} />}
        backLabel={backLabel}
        onBack={onBack}
        showBackButton={false}
        showIdentityBadge={false}
      />

      <MetricGrid className="sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={<RiskScoreLabel />}
          value={formatNumber(finding.risk_score)}
          hint={formatHintLabel(finding.risk_band) || "Unrated"}
        />
        <MetricCard
          label="CVSS"
          value={formatNumber(finding.cvss_score)}
          hint={formatHintLabel(finding.cvss_severity) || "Unspecified"}
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

      <FindingOverviewSection
        finding={finding}
        recommendationText={recommendationText}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_544px] xl:items-stretch">
        <div className="h-full">
          <FairFrequencyPanel
            title="Finding FAIR Event Frequency"
            description="Shows likelihood indicators for this finding without assigning dollar loss at the finding level."
            scopeLabel="finding"
            onPredict={predictFairFrequency}
          />
        </div>
        <div className="h-full">
          <FindingSupportingDetailsSection
            finding={finding}
            hasAttackContext={hasAttackContext}
            origin={origin}
            assetLabel={assetLabel}
            businessContext={businessContext}
          />
        </div>
      </div>
    </div>
  );
}

function RiskScoreLabel() {
  return (
    <span className="inline-flex items-center gap-1.5">
      Risk Score
      <HoverCard openDelay={150} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            aria-label="About risk score"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-72 text-sm leading-5">
          <div className="font-semibold text-slate-950">Risk Score</div>
          <p className="mt-1 text-sm font-normal leading-5 text-slate-500 normal-case">
            This is the finding-level risk score produced by our{" "}
            <span className="font-semibold text-slate-700">CRQ scoring system</span>
            {""}. It is derived from CVSS, EPSS, KEV, age, and related technical context for the finding.
          </p>
        </HoverCardContent>
      </HoverCard>
    </span>
  );
}

function formatHintLabel(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
