import { buildApiUrl, parseJsonOrThrow } from "./client";
import type { SeedUploadResult } from "./types";

export async function seedQualysCsv(
  file: File,
  source: string
): Promise<SeedUploadResult> {
  const formData = new FormData();
  formData.append("source", source);
  formData.append("file", file);

  const res = await fetch(buildApiUrl("/imports/findings/csv"), {
    method: "POST",
    body: formData,
  });

  return parseJsonOrThrow(
    res,
    `Failed to seed CSV: ${res.status} ${res.statusText}`
  );
}
