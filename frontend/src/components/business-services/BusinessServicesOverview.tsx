import { Building2, Network, ShieldAlert } from "lucide-react";

import { useBusinessUnits } from "../../hooks/topology/useBusinessUnits";
import type { BusinessUnitSummary } from "../../api/types";
import {
  Empty,
  EmptyActions,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../ui/empty";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { TopologyBreadcrumbs, TopologyOverviewSkeleton } from "./TopologyChrome";

interface BusinessServicesOverviewProps {
  refreshToken: number;
  onOpenBusinessUnit: (businessUnit: BusinessUnitSummary) => void;
}

export function BusinessServicesOverview({
  refreshToken,
  onOpenBusinessUnit,
}: BusinessServicesOverviewProps) {
  const { businessUnits, loading, error } = useBusinessUnits(refreshToken);

  if (loading) {
    return <TopologyOverviewSkeleton />;
  }

  if (error) {
    return (
      <TopologyEmptyState
        title={isTopologyUnavailable(error) ? "Topology schema not initialized" : "Unable to load business units"}
        description={
          isTopologyUnavailable(error)
            ? error
            : "The business-unit overview could not be loaded from the backend."
        }
      />
    );
  }

  if (businessUnits.length === 0) {
    return (
      <TopologyEmptyState
        title="No business units found"
        description="The topology endpoints are live, but the backend returned no business units."
      />
    );
  }

  const totals = businessUnits.reduce(
    (acc, businessUnit) => ({
      totalBusinessUnits: acc.totalBusinessUnits + 1,
      totalBusinessServices:
        acc.totalBusinessServices + businessUnit.metrics.total_business_services,
      totalFindings: acc.totalFindings + businessUnit.metrics.total_findings,
    }),
    { totalBusinessUnits: 0, totalBusinessServices: 0, totalFindings: 0 }
  );

  return (
    <section className="space-y-4">
      <TopologyBreadcrumbs items={[{ label: "Business Units" }]} />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Business units" value={totals.totalBusinessUnits} />
        <SummaryCard
          label="Business services"
          value={totals.totalBusinessServices}
        />
        <SummaryCard label="Open findings" value={totals.totalFindings} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {businessUnits.map((businessUnit) => (
          <button
            key={businessUnit.slug}
            type="button"
            onClick={() => onOpenBusinessUnit(businessUnit)}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex h-full flex-col gap-6">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {businessUnit.company?.name ?? "Unassigned company"}
                </div>
                <div className="text-2xl font-semibold tracking-tight text-slate-950">
                  {businessUnit.business_unit}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <InlineMetric
                  icon={Building2}
                  value={businessUnit.metrics.total_business_services}
                  label="Business services"
                />
                <InlineMetric
                  icon={Network}
                  value={businessUnit.metrics.total_assets}
                  label="Assets"
                />
                <InlineMetric
                  icon={ShieldAlert}
                  value={businessUnit.metrics.total_findings}
                  label="Findings"
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">
          {value.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

function InlineMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Building2;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function TopologyEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty>
      <EmptyIcon>
        <Building2 className="h-5 w-5" />
      </EmptyIcon>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyActions>
        <Button variant="outline" disabled>
          Live topology only
        </Button>
      </EmptyActions>
    </Empty>
  );
}

function isTopologyUnavailable(message: string) {
  return message.toLowerCase().includes("normalized topology");
}
