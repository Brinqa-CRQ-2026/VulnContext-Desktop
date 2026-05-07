import type { ReactNode } from "react";

import { cn } from "../../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";

export function ChartPanel({
  title,
  description,
  badge,
  loading,
  error,
  empty,
  emptyMessage = "No data",
  loadingMessage = "Loading data...",
  children,
  className,
  headerClassName,
  titleClassName,
  descriptionClassName,
  contentClassName,
  placeholderClassName,
  errorPlaceholderClassName,
}: {
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  placeholderClassName?: string;
  errorPlaceholderClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className={headerClassName}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className={cn("text-base", titleClassName)}>{title}</CardTitle>
            {description ? (
              <p className={cn("mt-1 text-sm text-slate-500", descriptionClassName)}>
                {description}
              </p>
            ) : null}
          </div>
          {badge}
        </div>
      </CardHeader>
      <CardContent className={contentClassName}>
        {loading || error || empty ? (
          <div
            className={cn(
              "flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500",
              error && errorPlaceholderClassName ? errorPlaceholderClassName : placeholderClassName
            )}
          >
            {loading ? loadingMessage : error ?? emptyMessage}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
