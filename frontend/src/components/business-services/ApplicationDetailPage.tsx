import { Network, ShieldAlert } from "lucide-react";

import { useApplicationDetail } from "../../hooks/topology/useApplicationDetail";
import type { AssetSummary } from "../../api/types";
import { AssetInventoryPanel } from "./AssetInventoryPanel";
import {
  formatSlugLabel,
  TopologyBreadcrumbs,
  TopologyPageSkeleton,
} from "./TopologyChrome";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../ui/empty";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

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
          { label: formatSlugLabel(applicationSlug, "Application") },
        ]}
        title="Loading application"
        backLabel="Back to Business Service"
        statCount={2}
        tableColumns={6}
      />
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
        onBack={onBack}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <TopologyBreadcrumbs
          items={[
            { label: "Business Units", onClick: onOpenOverview },
            { label: application.business_unit, onClick: onOpenBusinessUnit },
            { label: application.business_service, onClick: onOpenBusinessService },
            { label: application.application },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {application.business_unit} / {application.business_service}
            </p>
            <CardTitle className="mt-1 text-base">{application.application}</CardTitle>
          </div>
          <Button variant="outline" onClick={onBack}>
            Back to Business Service
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-4 md:grid-cols-2">
          <DetailStat label="Assets" value={application.metrics.total_assets} icon={Network} />
          <DetailStat
            label="Findings"
            value={application.metrics.total_findings}
            icon={ShieldAlert}
          />
        </dl>

        <AssetInventoryPanel
          businessUnit={application.business_unit}
          businessService={application.business_service}
          application={application.application}
          refreshToken={refreshToken}
          onOpenAsset={onOpenAssetFindings}
        />
      </CardContent>
    </Card>
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

function DetailEmptyState({ title, description, onBack }: { title: string; description: string; onBack: () => void }) {
  return (
    <Empty>
      <EmptyIcon>
        <Network className="h-5 w-5" />
      </EmptyIcon>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" onClick={onBack}>
        Back to Business Service
      </Button>
    </Empty>
  );
}

function isTopologyUnavailable(message: string | null) {
  return (message ?? "").toLowerCase().includes("normalized topology");
}
