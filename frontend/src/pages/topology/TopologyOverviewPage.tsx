import { Building2 } from "lucide-react";

import type { BusinessUnitSummary } from "../../types";
import { buildInitials } from "../../lib/formatting/text";
import { isTopologyUnavailable } from "../../lib/topology/topologyStatus";
import { cn } from "../../lib/utils";
import { useBusinessUnits } from "../../hooks/topology/business-units/useBusinessUnits";
import { LoadingSpinnerState } from "../../components/shared/LoadingSpinnerState";

interface TopologyOverviewPageProps {
  refreshToken: number;
  onOpenBusinessUnit: (businessUnit: BusinessUnitSummary) => void;
}

interface CompanyCardModel {
  businessUnit: BusinessUnitSummary;
  companyName: string;
  businessUnitName: string;
  description: string;
  initials: string;
  businessServices: number;
  assets: number;
}

export function TopologyOverviewPage({
  refreshToken,
  onOpenBusinessUnit,
}: TopologyOverviewPageProps) {
  const { businessUnits, loading, error } = useBusinessUnits(refreshToken);

  if (loading) {
    return (
      <section className="space-y-4">
        <LoadingSpinnerState message="Loading companies" />
      </section>
    );
  }

  if (error) {
    return (
      <TopologyEmptyState
        title={
          isTopologyUnavailable(error)
            ? "Topology schema not initialized"
            : "Unable to load companies"
        }
        description={
          isTopologyUnavailable(error)
            ? error
            : "The company overview could not be loaded from the backend."
        }
      />
    );
  }

  if (businessUnits.length === 0) {
    return (
      <TopologyEmptyState
        title="No companies found"
        description="The topology endpoints are live, but the backend returned no company records."
      />
    );
  }

  const cards = buildCompanyCards(businessUnits);
  return (
    <section className="space-y-4">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <CompanyCard
            key={card.businessUnit.slug}
            card={card}
            onClick={() => onOpenBusinessUnit(card.businessUnit)}
          />
        ))}
      </div>
    </section>
  );
}

function CompanyCard({
  card,
  onClick,
}: {
  card: CompanyCardModel;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${card.companyName} company card`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-950/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-semibold tracking-[0.16em] text-slate-700 shadow-none">
            {card.initials}
          </div>
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {card.businessUnitName}
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              {card.companyName}
            </h3>
          </div>
        </div>
      </div>

      <p
        className="mt-3 text-sm leading-6 text-slate-500"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2,
          overflow: "hidden",
        }}
      >
        {card.description}
      </p>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm leading-6 lg:grid-cols-3">
          <InlineMetric label="Business services" value={card.businessServices} />
          <InlineMetric label="Assets" value={card.assets} />
          <InlineMetric label="Findings" value={card.businessUnit.metrics.total_findings} />
        </div>
      </div>
    </button>
  );
}

function InlineMetric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={cn("text-xl font-semibold tracking-tight text-slate-950", valueClassName)}>
        {value.toLocaleString()}
      </span>
      <span className="text-sm font-medium text-slate-500">{label}</span>
    </div>
  );
}

function buildCompanyCards(businessUnits: BusinessUnitSummary[]): CompanyCardModel[] {
  const sortedBusinessUnits = [...businessUnits].sort(
    (left, right) => right.metrics.total_findings - left.metrics.total_findings
  );

  return sortedBusinessUnits.map((businessUnit) => {
    const companyName = businessUnit.company?.name ?? "Unassigned company";
    const description =
      businessUnit.description ??
      `Live business-unit coverage for ${businessUnit.business_unit} with ${businessUnit.metrics.total_business_services.toLocaleString()} services and ${businessUnit.metrics.total_assets.toLocaleString()} assets.`;

    return {
      businessUnit,
      companyName,
      businessUnitName: businessUnit.business_unit,
      description,
      initials: buildInitials(companyName),
      businessServices: businessUnit.metrics.total_business_services,
      assets: businessUnit.metrics.total_assets,
    };
  });
}

function TopologyEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="max-w-xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}
