import { useMemo } from "react";

import {
  businessServicesMockData,
  getCompanyBusinessUnitRecords,
  type CompanyBusinessUnitRecord,
} from "../../mocks/businessServices";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface BusinessServicesOverviewProps {
  onOpenCompanyBusinessUnit: (companyRecord: CompanyBusinessUnitRecord) => void;
}

export function BusinessServicesOverview({
  onOpenCompanyBusinessUnit,
}: BusinessServicesOverviewProps) {
  const filteredServices = businessServicesMockData;

  const totals = useMemo(() => {
    const companies = new Set(filteredServices.map((service) => service.company));

    return {
      totalCompanies: companies.size,
      totalAffectedAssets: filteredServices.reduce(
        (sum, service) => sum + service.affectedAssets,
        0
      ),
      totalOpenFindings: filteredServices.reduce(
        (sum, service) => sum + service.openFindings,
        0
      ),
    };
  }, [filteredServices]);

  const companyCards = useMemo(
    () => getCompanyBusinessUnitRecords(filteredServices),
    [filteredServices]
  );

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total companies"
          value={totals.totalCompanies}
        />
        <SummaryCard
          label="Affected assets"
          value={totals.totalAffectedAssets}
        />
        <SummaryCard
          label="Open findings"
          value={totals.totalOpenFindings}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {companyCards.map((companyRecord) => (
          <button
            key={companyRecord.slug}
            type="button"
            onClick={() => onOpenCompanyBusinessUnit(companyRecord)}
            className="min-h-[700px] rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-center text-white shadow-lg shadow-slate-950/20 transition hover:scale-[1.01] hover:border-blue-400/40"
          >
            <div className="flex h-full flex-col items-center justify-center">
              <div className="text-3xl font-semibold tracking-tight md:text-4xl">
                {companyRecord.company}
              </div>
              <div className="mt-3 text-lg text-slate-200 md:text-xl">
                {companyRecord.businessUnits.join(", ")}
              </div>
              <div className="mt-8 grid w-full grid-cols-3 gap-4">
                <InlineMetric
                  value={companyRecord.services.length.toLocaleString()}
                  label="Business services"
                />
                <InlineMetric
                  value={companyRecord.totalAffectedAssets.toLocaleString()}
                  label="Affected assets"
                />
                <InlineMetric
                  value={companyRecord.totalOpenFindings.toLocaleString()}
                  label="Open findings"
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

interface InlineMetricProps {
  value: string;
  label: string;
}

function InlineMetric({ value, label }: InlineMetricProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-2xl font-bold text-white md:text-3xl">{value}</div>
      <div className="mt-1 text-center text-xs uppercase tracking-wide text-slate-200 md:text-sm">
        {label}
      </div>
    </div>
  );
}
