import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import type { BreadcrumbEntry } from "../TopologyChrome";
import { TopologyBreadcrumbs } from "../TopologyChrome";
import { Button } from "../../ui/button";
import { InitialsBadge } from "./TopologyBadges";

export function EntityHero({
  breadcrumbs,
  title,
  label,
  context,
  metadata,
  secondaryContext,
  description,
  fallbackDescription,
  actions,
  tags,
  backLabel = "Back",
  showBackButton = true,
  onBack,
}: {
  breadcrumbs: BreadcrumbEntry[];
  title: string;
  label: string;
  context?: string;
  metadata?: ReactNode;
  secondaryContext?: ReactNode;
  description?: string | null;
  fallbackDescription?: string;
  actions?: ReactNode;
  tags?: ReactNode;
  backLabel?: string;
  showBackButton?: boolean;
  onBack: () => void;
}) {
  const displayDescription = description?.trim() || fallbackDescription;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <TopologyBreadcrumbs items={breadcrumbs} />
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <InitialsBadge value={title} />
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-slate-500">
              {label}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            {context ? (
              <p className="mt-1 text-sm font-normal leading-6 text-slate-500">
                {context}
              </p>
            ) : null}
            {metadata ? (
              <p className="mt-1 break-words text-sm font-normal leading-6 text-slate-500">
                {metadata}
              </p>
            ) : null}
            {secondaryContext ? (
              <p className="mt-1 text-sm font-normal leading-6 text-slate-500">
                {secondaryContext}
              </p>
            ) : null}
            {displayDescription ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {displayDescription}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {tags}
          {actions}
          {showBackButton ? (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
