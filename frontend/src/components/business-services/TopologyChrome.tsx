import { Fragment } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { Skeleton } from "../ui/skeleton";

export interface BreadcrumbEntry {
  label: string;
  onClick?: () => void;
}

export function TopologyBreadcrumbs({ items }: { items: BreadcrumbEntry[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            <BreadcrumbItem>
              {index === items.length - 1 ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : item.onClick ? (
                <BreadcrumbLink asChild>
                  <button type="button" onClick={item.onClick}>
                    {item.label}
                  </button>
                </BreadcrumbLink>
              ) : (
                <span>{item.label}</span>
              )}
            </BreadcrumbItem>
            {index < items.length - 1 ? <BreadcrumbSeparator /> : null}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function formatSlugLabel(slug: string | null, fallback: string) {
  if (!slug) return fallback;

  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function TopologyPageSkeleton({
  breadcrumbs,
  title,
  backLabel,
  statCount = 3,
  tableColumns = 5,
  tableRows = 4,
}: {
  breadcrumbs: BreadcrumbEntry[];
  title: string;
  backLabel: string;
  statCount?: number;
  tableColumns?: number;
  tableRows?: number;
}) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <TopologyBreadcrumbs items={breadcrumbs} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {title}
            </p>
            <Skeleton className="h-7 w-64 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Button variant="outline" disabled>
            {backLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${statCount}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: statCount }, (_, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${tableColumns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: tableColumns }, (_, index) => (
                <Skeleton key={index} className="h-3 w-full" />
              ))}
            </div>
          </div>
          <div className="space-y-3 p-4">
            {Array.from({ length: tableRows }, (_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${tableColumns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: tableColumns }, (_, colIndex) => (
                  <Skeleton key={colIndex} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TopologyOverviewSkeleton() {
  return (
    <section className="space-y-4">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex aspect-square flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-44 max-w-full" />
                </div>
              </div>
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="mt-5 flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="mt-2 flex-1">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }, (_, metricIndex) => (
                <div
                  key={metricIndex}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-7 w-12" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 h-4 w-4/5 border-t border-slate-100 pt-3" />
          </div>
        ))}
      </div>
    </section>
  );
}
