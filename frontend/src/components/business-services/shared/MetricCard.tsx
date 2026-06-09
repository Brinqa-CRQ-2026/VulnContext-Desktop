import type { PropsWithChildren } from "react";
import type { ReactNode } from "react";

import { cn } from "../../../lib/utils";
import { Card, CardContent } from "../../ui/card";

export function MetricGrid({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <dl className={cn("grid gap-4", className)}>{children}</dl>;
}

export function MetricCard({
  label,
  value,
  hint,
  className,
  contentClassName,
  labelClassName,
  valueClassName,
}: {
  label: ReactNode;
  value: string | number;
  hint?: ReactNode;
  className?: string;
  contentClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className={cn("p-4", contentClassName)}>
        <dt
          className={cn(
            "text-xs font-semibold uppercase tracking-wide text-slate-500",
            labelClassName
          )}
        >
          {label}
        </dt>
        <dd
          className={cn(
            "mt-3 text-2xl font-semibold tracking-tight text-slate-950",
            valueClassName
          )}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </dd>
        {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
