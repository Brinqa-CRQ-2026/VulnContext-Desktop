export type RiskBand = "Critical" | "High" | "Medium" | "Low";

export type RiskBandFilter = "All" | RiskBand;

export interface RiskBandSummary {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}
