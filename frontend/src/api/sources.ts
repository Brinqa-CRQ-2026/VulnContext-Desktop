import { buildApiUrl, parseJsonOrThrow } from "./client";
import type {
  SourceDeleteResult,
  SourceRenameResult,
  SourceSummary,
} from "./types";

export async function getSourcesSummary(): Promise<SourceSummary[]> {
  const res = await fetch(buildApiUrl("/sources"));
  return parseJsonOrThrow(
    res,
    `Failed to fetch sources: ${res.status} ${res.statusText}`
  );
}

export async function renameSource(
  oldSource: string,
  newSource: string
): Promise<SourceRenameResult> {
  const encoded = encodeURIComponent(oldSource);
  const res = await fetch(buildApiUrl(`/sources/${encoded}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ new_source: newSource }),
  });
  return parseJsonOrThrow(
    res,
    `Failed to rename source: ${res.status} ${res.statusText}`
  );
}

export async function deleteSource(source: string): Promise<SourceDeleteResult> {
  const encoded = encodeURIComponent(source);
  const res = await fetch(buildApiUrl(`/sources/${encoded}`), {
    method: "DELETE",
  });
  return parseJsonOrThrow(
    res,
    `Failed to delete source: ${res.status} ${res.statusText}`
  );
}
