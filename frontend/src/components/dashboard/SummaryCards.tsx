import type { ScoresSummary } from "../../types";
import { MetricCard, MetricGrid } from "../topology/shared/MetricCard";

interface SummaryCardsProps {
  summary: ScoresSummary | null;
  loading: boolean;
}

function formatScore(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(1);
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const totalFindings =
    summary?.total_findings !== undefined ? summary.total_findings : null;
  const bands = summary?.risk_bands;
  const kevFindings = summary?.kevFindingsTotal ?? 0;
  const criticalCount = bands?.Critical ?? 0;
  const averageRiskScore = summary?.average_risk_score ?? null;

  return (
    <MetricGrid className="md:grid-cols-4">
      <MetricCard
        label="Total Findings"
        value={loading && !summary ? "..." : totalFindings?.toLocaleString() ?? "—"}
      />
      <MetricCard
        label="KEV Findings"
        value={loading && !summary ? "..." : kevFindings.toLocaleString()}
      />
      <MetricCard
        label="Critical Findings"
        value={loading && !summary ? "..." : criticalCount.toLocaleString()}
      />
      <MetricCard
        label="Average Risk Score"
        value={loading && !summary ? "..." : formatScore(averageRiskScore)}
      />
    </MetricGrid>
  );
}
