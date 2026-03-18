import { useEffect, useState } from "react";
import {
  clearFindingDisposition,
  FindingDisposition,
  FindingDispositionResult,
  getFindingById,
  ScoredFinding,
  setFindingDisposition,
} from "../../api";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface FindingDetailPageProps {
  findingId: number;
  refreshToken: number;
  onBack: () => void;
  onDataChanged?: () => void;
}

const DISPOSITION_OPTIONS: Array<{
  value: Exclude<FindingDisposition, "none">;
  label: string;
}> = [
  { value: "ignored", label: "Ignored" },
  { value: "risk_accepted", label: "Risk Accepted" },
  { value: "false_positive", label: "False Positive" },
  { value: "not_applicable", label: "Not Applicable" },
];

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}

function formatNumber(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function badgeClass(kind: "neutral" | "warn" | "success" | "band", value?: string | null) {
  if (kind === "band") {
    const band = (value || "").toLowerCase();
    if (band === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
    if (band === "high") return "border-orange-200 bg-orange-50 text-orange-700";
    if (band === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
    if (band === "low") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (kind === "warn") return "border-amber-200 bg-amber-50 text-amber-700";
  if (kind === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Badge({
  children,
  kind = "neutral",
  value,
}: {
  children: string;
  kind?: "neutral" | "warn" | "success" | "band";
  value?: string | null;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass(kind, value)}`}
    >
      {children}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_minmax(0,1fr)] gap-3 py-1.5 text-sm">
      <div className="text-slate-500">{label}</div>
      <div className="min-w-0 break-words text-slate-900">{value ?? "—"}</div>
    </div>
  );
}

export function FindingDetailPage({
  findingId,
  refreshToken,
  onBack,
  onDataChanged,
}: FindingDetailPageProps) {
  const [finding, setFinding] = useState<ScoredFinding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dispositionDraft, setDispositionDraft] =
    useState<Exclude<FindingDisposition, "none">>("ignored");
  const [reasonDraft, setReasonDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [expiresAtDraft, setExpiresAtDraft] = useState("");
  const [savingDisposition, setSavingDisposition] = useState(false);
  const [dispositionError, setDispositionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadFinding() {
      try {
        setLoading(true);
        setError(null);
        const data = await getFindingById(findingId);
        if (!active) return;
        setFinding(data);
        const current = data.disposition;
        setDispositionDraft(current && current !== "none" ? current : "ignored");
        setReasonDraft(data.disposition_reason ?? "");
        setCommentDraft(data.disposition_comment ?? "");
        setExpiresAtDraft(toDateTimeLocalValue(data.disposition_expires_at));
        setDispositionError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load finding.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadFinding();
    return () => {
      active = false;
    };
  }, [findingId, refreshToken]);

  const applyDispositionToLocalFinding = (result: FindingDispositionResult) => {
    setFinding((prev) =>
      prev
        ? {
            ...prev,
            disposition: result.disposition,
            disposition_state: result.disposition_state ?? null,
            disposition_reason: result.disposition_reason ?? null,
            disposition_comment: result.disposition_comment ?? null,
            disposition_created_at: result.disposition_created_at ?? null,
            disposition_expires_at: result.disposition_expires_at ?? null,
            disposition_created_by: result.disposition_created_by ?? null,
          }
        : prev
    );
  };

  const handleSaveDisposition = async () => {
    if (!finding) return;
    try {
      setSavingDisposition(true);
      setDispositionError(null);
      const result = await setFindingDisposition(finding.id, {
        disposition: dispositionDraft,
        reason: reasonDraft.trim() || null,
        comment: commentDraft.trim() || null,
        expires_at: expiresAtDraft ? new Date(expiresAtDraft).toISOString() : null,
        actor: "ui",
      });
      applyDispositionToLocalFinding(result);
      onDataChanged?.();
    } catch (err) {
      setDispositionError(
        err instanceof Error ? err.message : "Failed to update disposition."
      );
    } finally {
      setSavingDisposition(false);
    }
  };

  const handleClearDisposition = async () => {
    if (!finding) return;
    try {
      setSavingDisposition(true);
      setDispositionError(null);
      const result = await clearFindingDisposition(finding.id, "ui");
      applyDispositionToLocalFinding(result);
      setReasonDraft("");
      setCommentDraft("");
      setExpiresAtDraft("");
      onDataChanged?.();
    } catch (err) {
      setDispositionError(
        err instanceof Error ? err.message : "Failed to clear disposition."
      );
    } finally {
      setSavingDisposition(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-slate-500">Loading finding...</CardContent>
      </Card>
    );
  }

  if (error || !finding) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Finding Details</CardTitle>
          <Button size="sm" variant="outline" onClick={onBack}>
            Back to Findings
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-rose-600">
          {error || "Finding not found."}
        </CardContent>
      </Card>
    );
  }

  const hasPrimaryDescription = Boolean(finding.description);
  const hasDistinctCveDescription =
    Boolean(finding.cveDescription) && finding.cveDescription !== finding.description;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge kind="band" value={finding.risk_band}>
                {finding.risk_band || "Unrated"}
              </Badge>
              <Badge>{finding.source || "unknown"}</Badge>
              {finding.isKev ? <Badge kind="warn">KEV / Actively Exploited</Badge> : null}
              {finding.lifecycle_status ? (
                <Badge>{`Lifecycle: ${finding.lifecycle_status}`}</Badge>
              ) : null}
              {finding.disposition && finding.disposition !== "none" ? (
                <Badge kind="warn">
                  {`Disposition: ${finding.disposition.replaceAll("_", " ")}`}
                </Badge>
              ) : null}
              {finding.compliance_status ? (
                <Badge kind="warn">{finding.compliance_status}</Badge>
              ) : null}
            </div>
            <CardTitle className="text-lg">
              {finding.display_name || finding.cve_id || "Finding"}
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {finding.uid || `Finding row ${finding.id}`}
              {finding.target_names ? ` • ${finding.target_names}` : ""}
              {finding.record_id ? ` • ${finding.record_id}` : ""}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onBack}>
            Back to Findings
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-slate-500">
              Display Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatNumber(finding.risk_score)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-slate-500">
              Vendor Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatNumber(finding.source_risk_score)}
            </div>
            <div className="text-xs text-slate-500">
              {finding.source_risk_rating || finding.source_risk_band || "Unspecified"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-slate-500">
              CVSS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatNumber(finding.cvss_score)}</div>
            <div className="text-xs text-slate-500">{finding.cvss_severity || "Unspecified"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-slate-500">
              EPSS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatNumber(finding.epss_score, 4)}</div>
            <div className="text-xs text-slate-500">
              Percentile {formatNumber(finding.epss_percentile, 4)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Remediation / Triage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">Disposition</span>
                <select
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={dispositionDraft}
                  onChange={(e) =>
                    setDispositionDraft(e.target.value as Exclude<FindingDisposition, "none">)
                  }
                  disabled={savingDisposition}
                >
                  {DISPOSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">Expires (optional)</span>
                <input
                  type="datetime-local"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={expiresAtDraft}
                  onChange={(e) => setExpiresAtDraft(e.target.value)}
                  disabled={savingDisposition}
                />
              </label>
            </div>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Reason (optional)</span>
              <input
                type="text"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={reasonDraft}
                onChange={(e) => setReasonDraft(e.target.value)}
                disabled={savingDisposition}
                placeholder="e.g. compensating control"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Comment / Notes</span>
              <textarea
                className="min-h-[132px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                disabled={savingDisposition}
              />
            </label>
            {dispositionError ? (
              <div className="text-xs text-rose-600">{dispositionError}</div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleSaveDisposition} disabled={savingDisposition}>
                {savingDisposition ? "Saving..." : "Save Disposition"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearDisposition}
                disabled={savingDisposition || !finding.disposition || finding.disposition === "none"}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Threat / KEV Intel</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            <DetailRow label="CISA KEV" value={finding.isKev ? "Yes" : "No"} />
            <DetailRow label="KEV date added" value={formatDate(finding.kevDateAdded)} />
            <DetailRow label="KEV due date" value={formatDate(finding.kevDueDate)} />
            <DetailRow label="Ransomware use" value={finding.kevRansomwareUse || "—"} />
            <DetailRow label="Vendor / Project" value={finding.kevVendorProject || "—"} />
            <DetailRow label="Product" value={finding.kevProduct || "—"} />
            <DetailRow
              label="KEV vulnerability name"
              value={finding.kevVulnerabilityName || "—"}
            />
            <DetailRow
              label="Required action"
              value={
                finding.kevRequiredAction ? (
                  <span className="whitespace-pre-wrap">{finding.kevRequiredAction}</span>
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>
      </div>

      {hasPrimaryDescription || hasDistinctCveDescription ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPrimaryDescription ? (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Vulnerability Description
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {finding.description}
                </p>
              </div>
            ) : null}
            {hasDistinctCveDescription ? (
              <div className="space-y-1 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  CVE Record Description
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {finding.cveDescription}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Finding Context</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            <DetailRow label="UID" value={finding.uid || "—"} />
            <DetailRow label="Record ID" value={finding.record_id || "—"} />
            <DetailRow label="Record link" value={finding.record_link || "—"} />
            <DetailRow label="Targets" value={finding.target_names || "—"} />
            <DetailRow label="Target IDs" value={finding.target_ids || "—"} />
            <DetailRow label="Status" value={finding.status || "—"} />
            <DetailRow label="Status category" value={finding.status_category || "—"} />
            <DetailRow label="Source status" value={finding.source_status || "—"} />
            <DetailRow label="Compliance" value={finding.compliance_status || "—"} />
            <DetailRow label="Severity" value={finding.severity || "—"} />
            <DetailRow label="Age (days)" value={formatNumber(finding.age_in_days, 0)} />
            <DetailRow label="Due date" value={formatDate(finding.due_date)} />
            <DetailRow label="First found" value={formatDate(finding.first_found, true)} />
            <DetailRow label="Last found" value={formatDate(finding.last_found, true)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Scoring & Ownership</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            <DetailRow label="CVE" value={finding.cve_id || "—"} />
            <DetailRow label="All CVEs" value={finding.cve_ids || "—"} />
            <DetailRow label="CWEs" value={finding.cwe_ids || "—"} />
            <DetailRow label="Attack vector" value={finding.attack_vector || "—"} />
            <DetailRow label="Attack complexity" value={finding.attack_complexity || "—"} />
            <DetailRow label="ATT&CK patterns" value={finding.attack_pattern_names || "—"} />
            <DetailRow label="ATT&CK techniques" value={finding.attack_technique_names || "—"} />
            <DetailRow label="ATT&CK tactics" value={finding.attack_tactic_names || "—"} />
            <DetailRow label="Risk owner" value={finding.risk_owner_name || "—"} />
            <DetailRow
              label="Remediation owner"
              value={finding.remediation_owner_name || "—"}
            />
            <DetailRow
              label="Remediation status"
              value={finding.remediation_status || "—"}
            />
            <DetailRow
              label="Remediation due"
              value={formatDate(finding.remediation_due_date)}
            />
            <DetailRow label="Internal notes" value={finding.internal_risk_notes || "—"} />
            <DetailRow
              label="Disposition updated"
              value={formatDate(finding.disposition_created_at, true)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
