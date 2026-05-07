export function riskBandWeight(value?: string | null) {
  switch ((value ?? "").toLowerCase()) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

export function riskBandPillClass(band?: string | null) {
  const value = (band || "").toLowerCase();
  if (value === "critical") return "bg-rose-100 text-rose-700";
  if (value === "high") return "bg-orange-100 text-orange-700";
  if (value === "medium") return "bg-amber-100 text-amber-700";
  if (value === "low") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}
