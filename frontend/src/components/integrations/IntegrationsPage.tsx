import { useMemo, useState } from "react";

import {
  deleteSource,
  renameSource,
} from "../../api";
import { useSourcesSummary } from "../../hooks/sources/useSourcesSummary";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SeedEmptyState } from "../dashboard/SeedEmptyState";

interface IntegrationsPageProps {
  refreshToken: number;
  onDataChanged: () => void;
}

export function IntegrationsPage({ refreshToken, onDataChanged }: IntegrationsPageProps) {
  const { sources, loading, error: loadError } = useSourcesSummary(refreshToken);
  const [error, setError] = useState<string | null>(null);

  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const hasSources = sources.length > 0;

  const onStartEdit = (source: string) => {
    setEditingSource(source);
    setEditedName(source);
  };

  const onCancelEdit = () => {
    setEditingSource(null);
    setEditedName("");
  };

  const onSaveEdit = async (oldSource: string) => {
    const next = editedName.trim();
    if (!next) {
      setError("Source name cannot be empty.");
      return;
    }

    try {
      setActionBusy(true);
      setError(null);
      await renameSource(oldSource, next);
      onCancelEdit();
      onDataChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to rename source.";
      setError(message);
    } finally {
      setActionBusy(false);
    }
  };

  const onDelete = async (source: string) => {
    const ok = window.confirm(
      `Delete source '${source}' and all associated findings from the database?`
    );
    if (!ok) return;

    try {
      setActionBusy(true);
      setError(null);
      await deleteSource(source);
      onDataChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete source.";
      setError(message);
    } finally {
      setActionBusy(false);
    }
  };

  const sortedSources = useMemo(() => {
    return [...sources].sort(
      (a, b) => b.total_findings - a.total_findings || a.source.localeCompare(b.source)
    );
  }, [sources]);

  return (
    <section className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Import Source Data</CardTitle>
        </CardHeader>
        <CardContent>
          <SeedEmptyState onSeeded={onDataChanged} compact />
        </CardContent>
      </Card>

      {(error || loadError) && <p className="text-sm text-rose-600">{error || loadError}</p>}

      {loading && <p className="text-sm text-slate-500">Loading sources…</p>}

      {!loading && !hasSources && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-500">
              No sources yet. Upload a CSV above to initialize your first source.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && hasSources && (
        <div className="grid gap-4">
          {sortedSources.map((source) => {
            const isEditing = editingSource === source.source;
            return (
              <Card key={source.source}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          disabled={actionBusy}
                        />
                      ) : (
                        <CardTitle className="truncate text-sm font-semibold">
                          {source.source}
                        </CardTitle>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {source.total_findings.toLocaleString()} findings
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onCancelEdit()}
                            disabled={actionBusy}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onSaveEdit(source.source)}
                            disabled={actionBusy}
                          >
                            Save
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStartEdit(source.source)}
                            disabled={actionBusy}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDelete(source.source)}
                            disabled={actionBusy}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Total Findings
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">
                        {source.total_findings.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Risk Breakdown
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-rose-600">Critical</span>
                          <span>{source.risk_bands.Critical.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-orange-500">High</span>
                          <span>{source.risk_bands.High.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-500">Medium</span>
                          <span>{source.risk_bands.Medium.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-600">Low</span>
                          <span>{source.risk_bands.Low.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
