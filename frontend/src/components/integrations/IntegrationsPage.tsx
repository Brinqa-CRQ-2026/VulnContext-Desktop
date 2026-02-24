import { useEffect, useMemo, useState } from "react";

import {
  deleteSource,
  getSourcesSummary,
  renameSource,
  SourceSummary,
} from "../../api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SeedEmptyState } from "../dashboard/SeedEmptyState";

interface IntegrationsPageProps {
  refreshToken: number;
  onDataChanged: () => void;
}

export function IntegrationsPage({ refreshToken, onDataChanged }: IntegrationsPageProps) {
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    async function loadSources() {
      try {
        setLoading(true);
        setError(null);
        const data = await getSourcesSummary();
        setSources(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load integrations.");
      } finally {
        setLoading(false);
      }
    }

    loadSources();
  }, [refreshToken]);

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
          <CardTitle className="text-sm font-semibold">Add Scanner Data</CardTitle>
        </CardHeader>
        <CardContent>
          <SeedEmptyState onSeeded={onDataChanged} compact />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loading && <p className="text-sm text-slate-500">Loading integrations…</p>}

      {!loading && !hasSources && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-500">
              No source integrations yet. Upload a CSV above to initialize your first source.
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
                  <p className="mb-2 text-xs font-semibold text-slate-500">RISK DISTRIBUTION</p>
                  <div className="space-y-1 text-xs text-slate-600">
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
