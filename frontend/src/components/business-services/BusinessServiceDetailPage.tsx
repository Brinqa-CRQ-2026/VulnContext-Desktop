import { Layers3, Network, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { useBusinessServiceDetail } from "../../hooks/topology/useBusinessServiceDetail";
import type { ApplicationSummary, AssetSummary } from "../../api/types";
import {
  type ApplicationSortKey,
  ApplicationsDrillDownTable,
  type SortState,
} from "./DrillDownTables";
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
  const [applicationSort, setApplicationSort] = useState<SortState<ApplicationSortKey>>({
    key: "finding_count",
    order: "desc",
  });
  const { businessService, loading, error } = useBusinessServiceDetail(
    businessUnitSlug,
    businessServiceSlug,
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
          { label: formatSlugLabel(businessServiceSlug, "Business Service") },
        ]}
        title="Loading business service"
        backLabel="Back to Business Unit"
        statCount={3}
        tableColumns={6}
      />
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
            { label: businessService.business_unit, onClick: onOpenBusinessUnit },
            { label: businessService.business_service },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {businessService.company?.name ?? "Unassigned company"}
            </p>
            <CardTitle className="mt-1 text-base">
              {businessService.business_service}
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Business unit: {businessService.business_unit}
            </p>
          </div>
          <Button variant="outline" onClick={onBack}>
            Back to Business Unit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-4 md:grid-cols-3">
          <DetailStat
            icon={Layers3}
            label="Applications"
            value={businessService.metrics.total_applications}
          />
          <DetailStat
            icon={Network}
            label="Assets"
            value={businessService.metrics.total_assets}
          />
          <DetailStat
            icon={ShieldAlert}
            label="Findings"
            value={businessService.metrics.total_findings}
          />
        </dl>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Applications
            </h2>
          </div>
          {businessService.applications.length === 0 ? (
            <Empty className="min-h-[12rem]">
              <EmptyHeader>
                <EmptyTitle>No applications</EmptyTitle>
                <EmptyDescription>
                  This business service currently has no application drill-down rows.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ApplicationsDrillDownTable
              applications={businessService.applications}
              sort={applicationSort}
              onSortChange={setApplicationSort}
              onOpenApplication={onOpenApplication}
            />
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Direct assets
            </h2>
          </div>
          <AssetInventoryPanel
            businessUnit={businessService.business_unit}
            businessService={businessService.business_service}
            directOnly
            refreshToken={refreshToken}
            onOpenAsset={onOpenAssetFindings}
          />
        </section>
      </CardContent>
    </Card>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers3;
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

function DetailEmptyState({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
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
      <Button variant="outline" onClick={onBack}>
        Back to Business Unit
      </Button>
    </Empty>
  );
}

function isTopologyUnavailable(message: string | null) {
  return (message ?? "").toLowerCase().includes("normalized topology");
}
