import { Layers3 } from "lucide-react";
import { useCallback } from "react";

import { formatNumber } from "../../lib/formatting/numbers";
import { isTopologyUnavailable } from "../../lib/topology/topologyStatus";
import { useBusinessServiceDetail } from "../../hooks/topology/business-services/useBusinessServiceDetail";
import type { ApplicationSummary, AssetSummary } from "../../types";
import { useBusinessServiceAnalytics } from "../../hooks/topology/business-services/useBusinessServiceAnalytics";
import { predictBusinessServiceFairLoss } from "../../api/topology";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../../components/ui/empty";
import { EntityHero } from "../../components/topology/shared/EntityHero";
import { MetricCard, MetricGrid } from "../../components/topology/shared/MetricCard";
import { FairScopeLossPanel } from "../../components/fair/FairScopeLossPanel";
import { LoadingSpinnerState } from "../../components/shared/LoadingSpinnerState";
import {
  BusinessServiceAnalyticsSection,
  BusinessServiceApplicationsSection,
  BusinessServiceDirectAssetsSection,
} from "./BusinessServiceSections";

interface BusinessServiceDetailPageProps {
  businessUnitSlug: string | null;
  businessServiceSlug: string | null;
  refreshToken: number;
  onBack: () => void;
  onOpenOverview: () => void;
  onOpenBusinessUnit: () => void;
  onOpenApplication: (application: ApplicationSummary) => void;
  onOpenAssetFindings: (asset: AssetSummary) => void;
}

export function BusinessServiceDetailPage({
  businessUnitSlug,
  businessServiceSlug,
  refreshToken,
  onBack,
  onOpenOverview,
  onOpenBusinessUnit,
  onOpenApplication,
  onOpenAssetFindings,
}: BusinessServiceDetailPageProps) {
  const { businessService, loading, error } = useBusinessServiceDetail(
    businessUnitSlug,
    businessServiceSlug,
    refreshToken
  );
  const {
    analytics: businessServiceAnalytics,
    loading: businessServiceAnalyticsLoading,
    error: businessServiceAnalyticsError,
  } = useBusinessServiceAnalytics(businessUnitSlug, businessServiceSlug, refreshToken);
  const predictFairLoss = useCallback(
    (payload: Parameters<typeof predictBusinessServiceFairLoss>[2]) =>
      predictBusinessServiceFairLoss(
        businessUnitSlug ?? "",
        businessServiceSlug ?? "",
        payload
      ),
    [businessServiceSlug, businessUnitSlug]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSpinnerState message="Loading business service" />
      </div>
    );
  }

  if (error || !businessService) {
    return (
      <DetailEmptyState
        title={
          isTopologyUnavailable(error)
            ? "Topology schema not initialized"
            : "Business service not found"
        }
        description={
          error ?? "The selected business service does not exist in the live topology."
        }
      />
    );
  }

  const serviceRiskScore =
    businessService.risk_score ?? businessServiceAnalytics?.service_risk_score;
  const businessCriticalityScore =
    businessService.business_criticality_score ??
    businessServiceAnalytics?.business_criticality_score;

  return (
    <div className="vc-page-stack">
      <EntityHero
        breadcrumbs={[
          { label: "Business Units", onClick: onOpenOverview },
          { label: businessService.business_unit, onClick: onOpenBusinessUnit },
          { label: businessService.business_service },
        ]}
        label={businessService.business_unit}
        title={businessService.business_service}
        description={businessService.description}
        fallbackDescription="Description for this business service will appear here when it is available."
        showBackButton={false}
        showIdentityBadge={false}
        onBack={onBack}
      />

      <MetricGrid className="sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Service Risk Score"
          value={formatNumber(serviceRiskScore)}
        />
        <MetricCard
          label="Business Criticality"
          value={
            businessCriticalityScore !== null && businessCriticalityScore !== undefined
              ? formatNumber(businessCriticalityScore)
              : "-"
          }
        />
        <MetricCard
          label="Total Applications"
          value={businessService.metrics.total_applications}
        />
        <MetricCard label="Total Assets" value={businessService.metrics.total_assets} />
        <MetricCard
          label="Total Findings"
          value={businessService.metrics.total_findings}
        />
      </MetricGrid>

      <BusinessServiceAnalyticsSection
        businessService={businessService.business_service}
        assetTypes={businessServiceAnalytics?.asset_type_distribution ?? []}
        loading={businessServiceAnalyticsLoading}
        error={businessServiceAnalyticsError}
        fairPanel={
          businessUnitSlug && businessServiceSlug ? (
            <FairScopeLossPanel
              title="Business Service FAIR Loss Exposure"
              description="Estimates annualized loss exposure for this business service. Applications, assets, and findings act as likelihood drivers, while the service carries the monetary business impact."
              onPredict={predictFairLoss}
            />
          ) : null
        }
      />

      <BusinessServiceApplicationsSection
        applications={businessService.applications}
        onOpenApplication={onOpenApplication}
      />

      <BusinessServiceDirectAssetsSection
        businessService={businessService}
        refreshToken={refreshToken}
        onOpenAssetFindings={onOpenAssetFindings}
      />
    </div>
  );
}

function DetailEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty>
      <EmptyIcon>
        <Layers3 className="h-5 w-5" />
      </EmptyIcon>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
