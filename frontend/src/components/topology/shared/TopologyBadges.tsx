import type { ReactNode } from "react";

import { cn } from "../../../lib/utils";

type RiskBand = "Critical" | "High" | "Medium" | "Low";

export function InitialsBadge({
  value,
  size = "md",
  className,
}: {
  value: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 shadow-sm",
        size === "sm" ? "h-10 w-10 text-sm" : "h-12 w-12 text-base",
        className
      )}
    >
      {getInitials(value)}
    </div>
  );
}

export function RiskBadge({
  band,
  suffix = "Risk",
  className,
}: {
  band: RiskBand | null | undefined;
  suffix?: string;
  className?: string;
}) {
  if (!band) return null;
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
        riskBadgeClass(band),
        className
      )}
    >
      {band} {suffix}
    </span>
  );
}

export function StatusBadge({
  children,
  tone,
  className,
}: {
  children: ReactNode;
  tone:
    | "Critical"
    | "High"
    | "Medium"
    | "Low"
    | "neutral"
    | "warn"
    | "dark"
    | "low"
    | "active"
    | "fixed"
    | string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        statusBadgeClass(tone),
        className
      )}
    >
      {children}
    </span>
  );
}

function getInitials(value: string) {
  const words = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function riskBadgeClass(band: RiskBand) {
  switch (band) {
    case "Critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "High":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "Medium":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "Low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function statusBadgeClass(tone: string) {
  if (tone === "active") return "bg-emerald-100 text-emerald-700";
  if (tone === "fixed") return "bg-slate-100 text-slate-700";
  if (tone === "Critical") return "bg-rose-100 text-rose-700";
  if (tone === "High") return "bg-orange-100 text-orange-700";
  if (tone === "Medium") return "bg-amber-100 text-amber-700";
  if (tone === "Low" || tone === "low") return "bg-emerald-100 text-emerald-700";
  if (tone === "warn") return "border border-amber-200 bg-amber-50 text-amber-700";
  if (tone === "dark") return "bg-slate-900 text-white";
  return "bg-slate-100 text-slate-700";
}
