// src/components/dashboard/AgeVulnerabilitiesModal.tsx
import React, { useEffect, useState } from "react";
import { ScoredFinding, getVulnerabilitiesByAge } from "../../api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { VulnerabilityDrawer } from "./VulnerabilityDrawer";

interface AgeVulnerabilitiesModalProps {
  ageRange: string | null;
  onClose: () => void;
}

export function AgeVulnerabilitiesModal({
  ageRange,
  onClose,
}: AgeVulnerabilitiesModalProps) {
  const [vulnerabilities, setVulnerabilities] = useState<ScoredFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<ScoredFinding | null>(null);

  useEffect(() => {
    if (!ageRange) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getVulnerabilitiesByAge(ageRange!);
        setVulnerabilities(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load vulnerabilities for this age range.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [ageRange]);

  if (!ageRange) return null;

  const bandPillClass = (band: string) => {
    const b = band.toLowerCase();
    if (b === "critical") return "bg-rose-100 text-rose-700";
    if (b === "high") return "bg-orange-100 text-orange-700";
    if (b === "medium") return "bg-amber-100 text-amber-700";
    if (b === "low") return "bg-emerald-100 text-emerald-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Vulnerabilities aged {ageRange}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Unresolved vulnerabilities in this age range
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading && (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-slate-400">Loading vulnerabilities...</p>
              </div>
            )}

            {error && (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {!loading && !error && vulnerabilities.length === 0 && (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-slate-400">No vulnerabilities found in this age range.</p>
              </div>
            )}

            {!loading && !error && vulnerabilities.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs font-semibold text-slate-600">
                        Asset
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">
                        CVE
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">
                        Description
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">
                        CVSS
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">
                        Risk
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">
                        Band
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vulnerabilities.map((vuln) => (
                      <TableRow
                        key={vuln.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setSelectedFinding(vuln)}
                      >
                        <TableCell className="text-xs">
                          {vuln.hostname || vuln.asset_id}
                        </TableCell>
                        <TableCell className="text-xs">
                          {vuln.cve_id || "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-md truncate">
                          {vuln.description || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {vuln.cvss_score.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {vuln.risk_score.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                              bandPillClass(vuln.risk_band)
                            }
                          >
                            {vuln.risk_band}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-3 bg-slate-50">
            <p className="text-xs text-slate-500">
              {vulnerabilities.length} {vulnerabilities.length === 1 ? "vulnerability" : "vulnerabilities"} found
            </p>
          </div>
        </div>
      </div>

      {/* Vulnerability detail drawer */}
      {selectedFinding && (
        <VulnerabilityDrawer
          finding={selectedFinding}
          onClose={() => setSelectedFinding(null)}
        />
      )}
    </>
  );
}
