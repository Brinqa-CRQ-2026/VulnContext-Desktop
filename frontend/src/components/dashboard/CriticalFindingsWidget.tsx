import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { getCriticalUrgentFindings, ScoredFinding } from "../../api";
import { VulnerabilityDrawer } from "./VulnerabilityDrawer";

export function CriticalFindingsWidget() {
  const [findings, setFindings] = useState<ScoredFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<ScoredFinding | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await getCriticalUrgentFindings(5);
        setFindings(result);
      } catch (err) {
        console.error("Failed to fetch top risk findings:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="shadow-md border-slate-200/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Top 5 Riskiest Vulnerabilities
          </CardTitle>
          <CardDescription className="text-xs">
            Highest risk unresolved findings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-slate-500">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-md border-slate-200/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Top 5 Riskiest Vulnerabilities
          </CardTitle>
          <CardDescription className="text-xs">
            Highest risk unresolved findings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (findings.length === 0) {
    return (
      <Card className="shadow-md border-slate-200/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Top 5 Riskiest Vulnerabilities
          </CardTitle>
          <CardDescription className="text-xs">
            Highest risk unresolved findings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-slate-500">
            No unresolved vulnerabilities
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (band: string) => {
    switch (band) {
      case "Critical":
        return "bg-red-100 text-red-700 border-red-300";
      case "High":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "Low":
        return "bg-blue-100 text-blue-700 border-blue-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  return (
    <>
      <Card className="shadow-md border-slate-200/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Top 5 Riskiest Vulnerabilities
          </CardTitle>
          <CardDescription className="text-xs">
            Click any row to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {findings.map((finding, index) => (
              <div
                key={finding.id}
                onClick={() => setSelectedFinding(finding)}
                className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-slate-300 hover:shadow-sm"
              >
                {/* Rank Number */}
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                  {index + 1}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-slate-700 truncate">
                      {finding.cve_id || finding.finding_id}
                    </span>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${getRiskColor(finding.risk_band)}`}>
                      {finding.risk_band.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    {finding.hostname || finding.asset_id} • {finding.description?.substring(0, 80)}...
                  </div>
                </div>

                {/* Risk Score */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs text-slate-500">Risk</div>
                  <div className="text-lg font-bold text-slate-700">
                    {finding.risk_score.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedFinding && (
        <VulnerabilityDrawer
          finding={selectedFinding}
          onClose={() => setSelectedFinding(null)}
        />
      )}
    </>
  );
}

