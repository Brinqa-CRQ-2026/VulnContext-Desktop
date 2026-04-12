import { type CompanyBusinessUnitRecord } from "../../mocks/businessServices";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface BusinessServiceDetailPageProps {
  service: CompanyBusinessUnitRecord | null;
  onBack: () => void;
}

export function BusinessServiceDetailPage({
  service,
  onBack,
}: BusinessServiceDetailPageProps) {
  if (!service) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company view not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            The requested company or business-unit view does not exist in the current
            mocked dataset.
          </p>
          <Button variant="outline" onClick={onBack}>
            Back to Business Services Overview
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{service.company}</CardTitle>
            <p className="text-sm text-slate-500">
              Business unit: {service.businessUnits.join(", ")}
            </p>
          </div>
          <Button variant="outline" onClick={onBack}>
            Back to Business Services Overview
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-4 md:grid-cols-3">
          <DetailStat label="Business services" value={String(service.services.length)} />
          <DetailStat
            label="Affected assets"
            value={service.totalAffectedAssets.toLocaleString()}
          />
          <DetailStat
            label="Open findings"
            value={service.totalOpenFindings.toLocaleString()}
          />
        </dl>

        <div className="grid gap-4 md:grid-cols-2">
          {service.services.map((businessService) => (
            <article
              key={businessService.id}
              className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-center text-white shadow-lg shadow-slate-950/20"
            >
              <div className="flex min-h-[320px] flex-col items-center justify-center">
                <div className="text-3xl font-semibold tracking-tight md:text-4xl">
                  {businessService.businessService}
                </div>
                <div className="mt-3 text-lg text-slate-200 md:text-xl">
                  {businessService.businessUnit}
                </div>
                <div className="mt-8 grid w-full grid-cols-2 gap-4">
                  <InlineMetric
                    value={businessService.affectedAssets.toLocaleString()}
                    label="Affected assets"
                  />
                  <InlineMetric
                    value={businessService.openFindings.toLocaleString()}
                    label="Open findings"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface DetailStatProps {
  label: string;
  value: string;
}

function DetailStat({ label, value }: DetailStatProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-lg font-semibold text-slate-900">{value}</dd>
    </div>
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
