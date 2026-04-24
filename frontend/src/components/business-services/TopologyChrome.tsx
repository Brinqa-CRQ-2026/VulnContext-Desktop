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
      <TopologyBreadcrumbs items={[{ label: "Business Units" }]} />

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle>
                <Skeleton className="h-3 w-28" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-56 max-w-full" />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }, (_, metricIndex) => (
                  <div
                    key={metricIndex}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-3 h-7 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
