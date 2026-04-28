import type { PropsWithChildren } from "react";

import { cn } from "../../lib/utils";

export type PillTone = "neutral" | "warn" | "success" | "dark";

export function Pill({
  tone,
  className,
  children,
}: PropsWithChildren<{ tone: PillTone; className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : tone === "dark"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-slate-50 text-slate-700",
        className
      )}
    >
      {children}
    </span>
  );
}
