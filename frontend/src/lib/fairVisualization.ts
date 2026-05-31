import type {
  FairLossPredictionResponse,
  ScoredFinding,
} from "../types";

export function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value?: number | null, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(digits)}%`;
}

export function getRiskDrivers(
  finding: ScoredFinding,
  prediction: FairLossPredictionResponse
) {
  const raw = [
    {
      label: "Weak controls",
      value: Math.max(0.08, 1 - prediction.control_score),
    },
    {
      label: "Exploit likelihood",
      value: Math.max(0.08, finding.epss_score ?? prediction.vulnerability),
    },
    {
      label: "Primary loss",
      value: Math.max(0.08, prediction.primary_mean / Math.max(prediction.primary_mean + prediction.secondary_mean, 1)),
    },
    {
      label: "Secondary loss",
      value: Math.max(0.08, prediction.secondary_mean / Math.max(prediction.primary_mean + prediction.secondary_mean, 1)),
    },
    {
      label: "Known exploitation",
      value: finding.isKev ? 0.8 : 0.12,
    },
  ];
  const total = raw.reduce((sum, item) => sum + item.value, 0);
  return raw.map((item) => ({
    ...item,
    percent: item.value / total,
  }));
}
