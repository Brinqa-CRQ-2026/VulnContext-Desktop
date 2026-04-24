import { ChevronRight, Layers3, Network, ShieldAlert } from "lucide-react";

import { useBusinessUnitDetail } from "../../hooks/topology/useBusinessUnitDetail";
import type { BusinessServiceSummary } from "../../api/types";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../ui/empty";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  formatSlugLabel,
  TopologyBreadcrumbs,
  TopologyPageSkeleton,
} from "./TopologyChrome";

interface BusinessUnitDetailPageProps {
  businessUnitSlug: string | null;
  refreshToken: number;
  onBack: () => void;
  onOpenOverview: () => void;
  onOpenBusinessService: (businessService: BusinessServiceSummary) => void;
}

export function BusinessUnitDetailPage({
  businessUnitSlug,
  refreshToken,
  onBack,
  onOpenOverview,
  onOpenBusinessService,
}: BusinessUnitDetailPageProps) {
  const { businessUnit, loading, error } = useBusinessUnitDetail(
    businessUnitSlug,
    refreshToken
  );

  if (loading) {
    return (
      <TopologyPageSkeleton
        breadcrumbs={[
          { label: "Business Units", onClick: onOpenOverview },
          { label: formatSlugLabel(businessUnitSlug, "Business Unit") },
        ]}
        title="Loading business unit"
        backLabel="Back to Business Units"
        statCount={4}
        tableColumns={3}
      />
    );
  }

  if (error || !businessUnit) {
    return (
      <DetailEmptyState
        title={
          isTopologyUnavailable(error)
            ? "Topology schema not initialized"
            : "Business unit not found"
        }
        description={
          error ?? "The selected business unit does not exist in the live topology."
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
            { label: businessUnit.business_unit },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {businessUnit.company?.name ?? "Unassigned company"}
            </p>
            <CardTitle className="mt-1 text-base">{businessUnit.business_unit}</CardTitle>
            {businessUnit.description ? (
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                {businessUnit.description}
              </p>
            ) : null}
          </div>
          <Button variant="outline" onClick={onBack}>
            Back to Business Units
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-4 md:grid-cols-4">
          <DetailStat
            icon={Layers3}
            label="Business services"
            value={businessUnit.metrics.total_business_services}
          />
          <DetailStat
            icon={Layers3}
            label="Applications"
            value={businessUnit.metrics.total_applications}
          />
          <DetailStat
            icon={Network}
            label="Assets"
            value={businessUnit.metrics.total_assets}
          />
          <DetailStat
            icon={ShieldAlert}
            label="Findings"
            value={businessUnit.metrics.total_findings}
          />
        </dl>

        {businessUnit.business_services.length === 0 ? (
          <Empty className="min-h-[12rem]">
            <EmptyHeader>
              <EmptyTitle>No business services</EmptyTitle>
              <EmptyDescription>
                This business unit currently has no child business services.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {businessUnit.business_services.map((businessService) => (
              <button
                key={businessService.slug}
                type="button"
                onClick={() => onOpenBusinessService(businessService)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div>
                  <div className="text-base font-semibold text-slate-950">
                    {businessService.business_service}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {businessService.metrics.total_applications.toLocaleString()} applications
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-slate-500">
                    <div>{businessService.metrics.total_assets.toLocaleString()} assets</div>
                    <div>{businessService.metrics.total_findings.toLocaleString()} findings</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        )}
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
        Back to Business Units
      </Button>
    </Empty>
  );
}

function isTopologyUnavailable(message: string | null) {
  return (message ?? "").toLowerCase().includes("normalized topology");
}
