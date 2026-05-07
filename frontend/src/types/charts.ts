export interface AssetScoreDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
  unscored: number;
}

export interface AssetTypeDistributionItem {
  label: string;
  count: number;
}
