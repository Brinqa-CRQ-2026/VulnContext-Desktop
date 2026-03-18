import { useEffect, useState } from "react";

import {
  getRiskWeights,
  RiskWeightsConfig,
  updateRiskWeights,
} from "../../api";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

interface RiskWeightsEditorProps {
  refreshToken: number;
  onWeightsUpdated: () => void;
}

const FIELD_ORDER: Array<keyof RiskWeightsConfig> = [
  "cvss_weight",
  "epss_weight",
  "kev_weight",
  "asset_criticality_weight",
  "context_weight",
];

const FIELD_LABELS: Record<keyof RiskWeightsConfig, string> = {
  cvss_weight: "CVSS weight",
  epss_weight: "EPSS weight",
  kev_weight: "KEV weight",
  asset_criticality_weight: "Asset criticality weight",
  context_weight: "Analyst context weight",
};

export function RiskWeightsEditor({ refreshToken, onWeightsUpdated }: RiskWeightsEditorProps) {
  const [weights, setWeights] = useState<RiskWeightsConfig | null>(null);
  const [draft, setDraft] = useState<Record<keyof RiskWeightsConfig, string> | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const current = await getRiskWeights();
        setWeights(current);
        setDraft({
          cvss_weight: String(current.cvss_weight),
          epss_weight: String(current.epss_weight),
          kev_weight: String(current.kev_weight),
          asset_criticality_weight: String(current.asset_criticality_weight),
          context_weight: String(current.context_weight),
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load risk weights.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [refreshToken]);

  const onStartEdit = () => {
    if (!weights) return;
    setDraft({
      cvss_weight: String(weights.cvss_weight),
      epss_weight: String(weights.epss_weight),
      kev_weight: String(weights.kev_weight),
      asset_criticality_weight: String(weights.asset_criticality_weight),
      context_weight: String(weights.context_weight),
    });
    setMessage(null);
    setError(null);
    setEditing(true);
  };

  const onCancel = () => {
    setEditing(false);
    setError(null);
    if (weights) {
      setDraft({
        cvss_weight: String(weights.cvss_weight),
        epss_weight: String(weights.epss_weight),
        kev_weight: String(weights.kev_weight),
        asset_criticality_weight: String(weights.asset_criticality_weight),
        context_weight: String(weights.context_weight),
      });
    }
  };

  const onSave = async () => {
    if (!draft) return;

    const parsed: Partial<RiskWeightsConfig> = {};
    for (const key of FIELD_ORDER) {
      const value = Number(draft[key]);
      if (!Number.isFinite(value)) {
        setError(`Invalid number for ${FIELD_LABELS[key]}.`);
        return;
      }
      parsed[key] = value;
    }

    const next = parsed as RiskWeightsConfig;
    const nonNegativeSum =
      next.cvss_weight +
      next.epss_weight +
      next.kev_weight +
      next.asset_criticality_weight +
      next.context_weight;

    const nonNegativeFields: Array<keyof RiskWeightsConfig> = [
      "cvss_weight",
      "epss_weight",
      "kev_weight",
      "asset_criticality_weight",
      "context_weight",
    ];
    for (const field of nonNegativeFields) {
      if (next[field] < 0) {
        setError(`${FIELD_LABELS[field]} must be >= 0.`);
        return;
      }
      if (next[field] > 1) {
        setError(`${FIELD_LABELS[field]} must be <= 1.`);
        return;
      }
    }
    if (Math.abs(nonNegativeSum - 1.0) > 0.001) {
      setError("Weights must sum to 1.0.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const result = await updateRiskWeights(next);
      setWeights(result.weights);
      setEditing(false);
      setMessage(
        `Updated weights and recalculated ${result.updated_rows.toLocaleString()} findings.`
      );
      onWeightsUpdated();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Failed to update risk weights.";
      setError(messageText);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Risk Scoring Model</CardTitle>
          {!editing ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFormulaModal(true)}
                disabled={loading}
              >
                More info
              </Button>
              <Button variant="outline" size="sm" onClick={onStartEdit} disabled={loading || !weights}>
                Edit Weights
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving || !draft}>
                {saving ? "Updating..." : "Save + Recalculate"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-slate-500">Loading scoring model…</p>}

        {!loading && weights && editing && draft && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {FIELD_ORDER.map((key) => (
                <label key={key} className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">{FIELD_LABELS[key]}</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft[key]}
                    onChange={(event) =>
                      setDraft((prev) => (prev ? { ...prev, [key]: event.target.value } : prev))
                    }
                    disabled={saving}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Guardrails: each weight must be between 0 and 1, and all weights together must sum to 1.0.
            </p>
          </>
        )}

        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
      </CardContent>

      {showFormulaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setShowFormulaModal(false)}
        >
          <div
            className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                Risk Modelling Approach
              </h3>
              <Button variant="outline" size="sm" onClick={() => setShowFormulaModal(false)}>
                Close
              </Button>
            </div>
            <p className="mb-3 text-base text-slate-700">
              We calculate each finding's risk score by combining several factors, each with a
              configurable weight.
            </p>
            <div className="rounded-md border-2 border-amber-400 bg-white p-4 text-slate-700">
              <p className="mb-2 text-sm">
                In simple terms, each factor contributes part of the final score:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Higher CVSS and EPSS values increase the score.</li>
                <li>KEV findings receive an explicit exploitation boost.</li>
                <li>Higher asset criticality increases the score.</li>
                <li>Analyst context contributes an additional adjustment.</li>
              </ul>
              <p className="mt-3 text-sm">
                The final number is a weighted combination of these inputs, so tuning weights
                changes how strongly each signal affects prioritization.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
