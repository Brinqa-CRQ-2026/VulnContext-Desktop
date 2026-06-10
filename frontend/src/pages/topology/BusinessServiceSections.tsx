import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import type { ReactNode } from "react";

import { AssetInventoryPanel } from "../../components/topology/AssetInventoryPanel";
import { ChartPanel } from "../../components/topology/shared/ChartPanel";
import { ApplicationEntityCard } from "../../components/topology/shared/EntityCard";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../../components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "../../components/ui/empty";
import type {
  ApplicationSummary,
  AssetSummary,
  AssetTypeDistributionItem,
  BusinessServiceDetail,
} from "../../types";

const assetTypeChartConfig = {
  count: {
    label: "Assets",
    color: "#2563eb",
  },
} satisfies ChartConfig;

export function BusinessServiceAnalyticsSection({
  businessService,
  assetTypes,
  loading,
  error,
  fairPanel,
}: {
  businessService: string;
  assetTypes: AssetTypeDistributionItem[];
  loading: boolean;
  error: string | null;
  fairPanel?: ReactNode;
}) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[28rem_minmax(0,1fr)]">
      <AssetTypeDistributionCard
        businessService={businessService}
        assetTypes={assetTypes}
        loading={loading}
        error={error}
      />
      {fairPanel ? <div className="min-w-0">{fairPanel}</div> : null}
    </div>
  );
}

export function BusinessServiceApplicationsSection({
  applications,
  onOpenApplication,
}: {
  applications: ApplicationSummary[];
  onOpenApplication: (application: ApplicationSummary) => void;
}) {
  return (
    <section className="mt-12 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">Applications</h2>
        <p className="mt-1 text-sm text-slate-500">
          Click an application to inspect its assets and scoped findings.
        </p>
      </div>

      {applications.length === 0 ? (
        <Empty className="min-h-[12rem]">
          <EmptyHeader>
            <EmptyTitle>No applications</EmptyTitle>
            <EmptyDescription>
              This business service currently has no application drill-down rows.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {applications.map((application) => (
            <ApplicationEntityCard
              key={application.slug}
              application={application}
              onOpen={() => onOpenApplication(application)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function BusinessServiceDirectAssetsSection({
  businessService,
  refreshToken,
  onOpenAssetFindings,
}: {
  businessService: BusinessServiceDetail;
  refreshToken: number;
  onOpenAssetFindings: (asset: AssetSummary) => void;
}) {
  return (
    <section className="mt-12 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">Direct Assets</h2>
        <p className="mt-1 text-sm text-slate-500">
          Assets directly associated with this business service.
        </p>
      </div>
      <AssetInventoryPanel
        businessUnit={businessService.business_unit}
        businessService={businessService.business_service}
        directOnly
        wrapInventoryContentInCard
        tableVariant="businessServiceDirect"
        refreshToken={refreshToken}
        onOpenAsset={onOpenAssetFindings}
      />
    </section>
  );
}

function AssetTypeDistributionCard({
  businessService,
  assetTypes,
  loading,
  error,
}: {
  businessService: string;
  assetTypes: AssetTypeDistributionItem[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <ChartPanel
      title="Asset Type Distribution"
      description={`Top 5 asset types under ${businessService}`}
      loading={loading}
      error={error}
      empty={assetTypes.length === 0}
      emptyMessage="No assets available."
      loadingMessage="Loading asset types..."
      className="w-full max-w-[28rem]"
      headerClassName="pb-3"
      titleClassName="text-sm text-slate-700"
      contentClassName="flex min-h-[220px] items-center justify-center"
      placeholderClassName="h-[180px] min-h-0 rounded-lg border-slate-200 bg-slate-50/60 text-slate-500"
      errorPlaceholderClassName="h-[180px] min-h-0 rounded-lg border-rose-200 bg-rose-50 text-rose-700"
    >
      <ChartContainer config={assetTypeChartConfig} className="h-[180px] w-full">
        <BarChart accessibilityLayer data={assetTypes}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            interval={0}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={6} />
        </BarChart>
      </ChartContainer>
    </ChartPanel>
  );
}
