export type BusinessUnitRiskBand = "Critical" | "High" | "Medium" | "Low";

export interface RiskTrendPoint {
  month: string;
  score: number;
}
