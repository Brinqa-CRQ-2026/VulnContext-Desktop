import { type ChangeEvent, useMemo, useState } from "react";
import { DatabaseZap } from "lucide-react";

import { seedQualysCsv } from "../../api";
import { Button } from "../ui/button";
import {
  Empty,
  EmptyActions,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "../ui/empty";
import { Input } from "../ui/input";

interface SeedEmptyStateProps {
  onSeeded: () => void;
  compact?: boolean;
}

export function SeedEmptyState({ onSeeded, compact = false }: SeedEmptyStateProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const helperText = useMemo(() => {
    if (!selectedFile) {
      return "Select a Qualys CSV to seed the local SQLite database.";
    }
    return `Selected: ${selectedFile.name}`;
  }, [selectedFile]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const next = event.target.files?.[0] ?? null;
    setSelectedFile(next);
  };

  const onUpload = async () => {
    const cleanedSource = sourceName.trim();
    if (!cleanedSource) {
      setError("Enter a source name (example: Qualys, Nessus, Tenable).");
      return;
    }

    if (!selectedFile) {
      setError("Select a CSV file first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await seedQualysCsv(selectedFile, cleanedSource);
      setSuccess(`Seeded ${result.inserted.toLocaleString()} findings from ${result.source}.`);
      onSeeded();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to seed CSV.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (compact) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-center">
          <Input
            type="text"
            value={sourceName}
            onChange={(event) => setSourceName(event.target.value)}
            placeholder="Source name (e.g. Qualys)"
            disabled={submitting}
          />
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            disabled={submitting}
          />
          <Button onClick={onUpload} disabled={submitting || !selectedFile || !sourceName.trim()}>
            {submitting ? "Seeding..." : "Import CSV"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">{helperText}</p>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        {success && <p className="mt-2 text-sm text-emerald-600">{success}</p>}
      </div>
    );
  }

  return (
    <Empty>
      <EmptyIcon>
        <DatabaseZap className="h-6 w-6" />
      </EmptyIcon>

      <EmptyHeader>
        <EmptyTitle>No vulnerability findings yet</EmptyTitle>
        <EmptyDescription>
          Import a Qualys export CSV to initialize dashboard data.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyActions className="items-center">
        <Input
          type="text"
          value={sourceName}
          onChange={(event) => setSourceName(event.target.value)}
          placeholder="Source name (e.g. Qualys)"
          className="max-w-xl"
          disabled={submitting}
        />

        <Input
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="max-w-xl"
          disabled={submitting}
        />

        <div className="flex flex-col items-center gap-2">
          <Button onClick={onUpload} disabled={submitting || !selectedFile || !sourceName.trim()}>
            {submitting ? "Seeding..." : "Seed from CSV"}
          </Button>
          <p className="text-xs text-slate-500">{helperText}</p>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
      </EmptyActions>
    </Empty>
  );
}
