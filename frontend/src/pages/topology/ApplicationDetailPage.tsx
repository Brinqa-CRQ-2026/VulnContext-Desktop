import { Network } from "lucide-react";
import { useCallback } from "react";

import { predictApplicationFairLoss } from "../../api/topology";
import { useApplicationDetail } from "../../hooks/topology/applications/useApplicationDetail";
import type { AssetSummary } from "../../types";
import { isTopologyUnavailable } from "../../lib/topology/topologyStatus";
import { formatNumber } from "../../lib/formatting/numbers";
import { AssetInventoryPanel } from "../../components/topology/AssetInventoryPanel";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../../components/ui/empty";
import { EntityHero } from "../../components/topology/shared/EntityHero";
import { MetricCard, MetricGrid } from "../../components/topology/shared/MetricCard";
import { FairFrequencyPanel } from "../../components/fair/FairFrequencyPanel";
import { LoadingSpinnerState } from "../../components/shared/LoadingSpinnerState";

interface ApplicationDetailPageProps {
  businessUnitSlug: string | null;
  businessServiceSlug: string | null;
  applicationSlug: string | null;
  refreshToken: number;
  onBack: () => void;
  onOpenOverview: () => void;
  onOpenBusinessUnit: () => void;
  onOpenBusinessService: () => void;
  onOpenAssetFindings: (asset: AssetSummary) => void;
}

export function ApplicationDetailPage({
  businessUnitSlug,
  businessServiceSlug,
  applicationSlug,
  refreshToken,
  onBack,
  onOpenOverview,
  onOpenBusinessUnit,
  onOpenBusinessService,
  onOpenAssetFindings,
}: ApplicationDetailPageProps) {
  const { application, loading, error } = useApplicationDetail(
    businessUnitSlug,
    businessServiceSlug,
    applicationSlug,
    refreshToken
  );
  const predictFairLoss = useCallback(
    (payload: Parameters<typeof predictApplicationFairLoss>[3]) =>
      predictApplicationFairLoss(
        businessUnitSlug ?? "",
        businessServiceSlug ?? "",
        applicationSlug ?? "",
        payload
      ),
    [applicationSlug, businessServiceSlug, businessUnitSlug]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSpinnerState message="Loading application" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <DetailEmptyState
        title={
          isTopologyUnavailable(error)
            ? "Topology schema not initialized"
            : "Application not found"
        }
        description={error ?? "The selected application could not be loaded."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <EntityHero
        breadcrumbs={[
          { label: "Business Units", onClick: onOpenOverview },
          { label: application.business_unit, onClick: onOpenBusinessUnit },
          { label: application.business_service, onClick: onOpenBusinessService },
          { label: application.application },
        ]}
        label={`${application.business_unit} / ${application.business_service}`}
        title={application.application}
        showBackButton={false}
        showIdentityBadge={false}
        onBack={onBack}
      />

      <MetricGrid className="md:grid-cols-3">
        <MetricCard
          label="Application Risk Score"
          value={formatNumber(application.application_risk_score)}
        />
        <MetricCard label="Assets" value={application.metrics.total_assets} />
        <MetricCard label="Findings" value={application.metrics.total_findings} />
      </MetricGrid>

      {businessUnitSlug && businessServiceSlug && applicationSlug ? (
        <FairFrequencyPanel
          title="Application FAIR Event Frequency"
          description="Aggregates TEF, LEF, vulnerability, and Security Score for this application. Monetary loss is modeled at the business service level."
          scopeLabel="application"
          onPredict={predictFairLoss}
        />
      ) : null}

      <AssetInventoryPanel
        businessUnit={application.business_unit}
        businessService={application.business_service}
        application={application.application}
        wrapInventoryContentInCard
        refreshToken={refreshToken}
        onOpenAsset={onOpenAssetFindings}
      />
    </div>
  );
}

function DetailEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Empty>
      <EmptyIcon>
        <Network className="h-5 w-5" />
      </EmptyIcon>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
