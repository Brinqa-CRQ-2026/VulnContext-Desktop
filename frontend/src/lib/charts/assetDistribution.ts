import type { AssetScoreDistribution } from "../../types";

export function toAssetDistributionChartRows(
  distribution: AssetScoreDistribution | null,
  { includeUnscoredWhenZero = false }: { includeUnscoredWhenZero?: boolean } = {}
) {
  if (!distribution) {
    return [];
  }

  const rows = [
    { key: "critical", label: "Critical", count: distribution.critical },
    { key: "high", label: "High", count: distribution.high },
    { key: "medium", label: "Medium", count: distribution.medium },
    { key: "low", label: "Low", count: distribution.low },
  ];

  if (includeUnscoredWhenZero || distribution.unscored > 0) {
    rows.push({ key: "unscored", label: "Unscored", count: distribution.unscored });
  }

  return rows;
}

export function toAssetCriticalityPieRows(distribution: AssetScoreDistribution | null) {
  return toAssetDistributionChartRows(distribution, { includeUnscoredWhenZero: true })
    .map((row) => ({
      key: row.key,
      count: row.count,
      fill: `var(--color-${row.key})`,
    }))
    .filter((row) => row.count > 0);
}

export function toAssetCriticalityLegendRows(distribution: AssetScoreDistribution | null) {
  const rows = [
    { key: "critical", value: "critical", color: "var(--color-critical)", type: "square" as const },
    { key: "high", value: "high", color: "var(--color-high)", type: "square" as const },
    { key: "medium", value: "medium", color: "var(--color-medium)", type: "square" as const },
    { key: "low", value: "low", color: "var(--color-low)", type: "square" as const },
  ];

  if ((distribution?.unscored ?? 0) > 0) {
    rows.push({
      key: "unscored",
      value: "unscored",
      color: "var(--color-unscored)",
      type: "square" as const,
    });
  }

  return rows;
}
