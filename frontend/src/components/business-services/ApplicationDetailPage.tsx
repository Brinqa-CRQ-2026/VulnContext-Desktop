import { Network, ShieldAlert } from "lucide-react";
import { useCallback } from "react";

import { predictApplicationFairLoss } from "../../api/topology";
import { useApplicationDetail } from "../../hooks/topology/applications/useApplicationDetail";
import type { AssetSummary } from "../../types";
import { isTopologyUnavailable } from "../../lib/topology/topologyStatus";
import { AssetInventoryPanel } from "./AssetInventoryPanel";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../ui/empty";
import { Card, CardContent } from "../ui/card";
import { EntityHero } from "./shared/EntityHero";
import { FairFrequencyPanel } from "../fair/FairFrequencyPanel";
import { LoadingSpinnerState } from "../shared/LoadingSpinnerState";

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

      <Card>
        <CardContent className="space-y-6 pt-6">
          <dl className="grid gap-4 md:grid-cols-2">
            <DetailStat label="Assets" value={application.metrics.total_assets} icon={Network} />
            <DetailStat
              label="Findings"
              value={application.metrics.total_findings}
              icon={ShieldAlert}
            />
          </dl>

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
            refreshToken={refreshToken}
            onOpenAsset={onOpenAssetFindings}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Network;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <dt className="text-xs font-semibold uppercase tracking-wide">{label}</dt>
      </div>
      <dd className="mt-2 text-lg font-semibold text-slate-900">
        {value.toLocaleString()}
      </dd>
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
