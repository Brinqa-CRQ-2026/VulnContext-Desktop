import type { PropsWithChildren, ReactNode } from "react";

import type { ApplicationSummary, BusinessServiceSummary } from "../../../types";
import { cn } from "../../../lib/utils";
import { InitialsBadge } from "./TopologyBadges";

export function BaseEntityCard({
  ariaLabel,
  onClick,
  leading,
  badge,
  entityType,
  title,
  identifier,
  description,
  footer,
  chart,
  className,
}: {
  ariaLabel: string;
  onClick: () => void;
  leading: ReactNode;
  badge?: ReactNode;
  entityType: string;
  title: string;
  identifier?: string;
  description?: ReactNode;
  footer?: ReactNode;
  chart?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-[14rem] flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        className
      )}
      aria-label={ariaLabel}
    >
      <div className="flex items-start justify-between gap-3">
        {leading}
        {badge}
      </div>

      <div className="mt-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500">
          {entityType}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
        {identifier ? (
          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {identifier}
          </p>
        ) : null}
        {description ? (
          <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {chart}

      {footer ? (
        <div className="mt-auto border-t border-slate-200 pt-4">{footer}</div>
      ) : null}
    </button>
  );
}

export function EntityMetricLine({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-2">
        <span className="text-base font-semibold text-slate-950 tabular-nums">
          {value.toLocaleString()}
        </span>
        <span className="truncate text-xs text-slate-500">{label}</span>
      </div>
    </div>
  );
}

export function EntityMetricFooter({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("grid grid-cols-3 gap-3", className)}>{children}</div>;
}

export function BusinessServiceEntityCard({
  businessService,
  onOpen,
}: {
  businessService: BusinessServiceSummary;
  onOpen: () => void;
}) {
  return (
    <BaseEntityCard
      ariaLabel={`Open ${businessService.business_service}`}
      onClick={onOpen}
      leading={<InitialsBadge value={businessService.business_service} size="sm" />}
      badge={
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
          No risk data
        </span>
      }
      entityType="Business Service"
      title={businessService.business_service}
      description="Service metadata will be populated when the backend returns service descriptions."
      footer={
        <EntityMetricFooter>
          <EntityMetricLine
            value={businessService.metrics.total_applications}
            label="Applications"
          />
          <EntityMetricLine value={businessService.metrics.total_assets} label="Assets" />
          <EntityMetricLine
            value={businessService.metrics.total_findings}
            label="Findings"
          />
        </EntityMetricFooter>
      }
    />
  );
}

export function ApplicationEntityCard({
  application,
  onOpen,
}: {
  application: ApplicationSummary & { description?: string | null };
  onOpen: () => void;
}) {
  return (
    <BaseEntityCard
      ariaLabel={`Open ${application.application}`}
      onClick={onOpen}
      leading={<InitialsBadge value={application.application} size="sm" />}
      entityType="Application"
      title={application.application}
      identifier={application.slug}
      description={application.description?.trim() || undefined}
      footer={
        <EntityMetricFooter className="grid-cols-2">
          <EntityMetricLine value={application.metrics.total_assets} label="Assets" />
          <EntityMetricLine
            value={application.metrics.total_findings}
            label="Findings"
          />
        </EntityMetricFooter>
      }
    />
  );
}
