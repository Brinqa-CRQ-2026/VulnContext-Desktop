export function isPopulatedText(value?: string | null) {
  return Boolean(value && value.trim());
}

export function joinDisplayText(
  values: Array<string | null | undefined>,
  fallback = "-"
) {
  return values.filter((value) => isPopulatedText(value ?? null)).join(" / ") || fallback;
}

export function formatText(value?: string | null, fallback = "-") {
  return value && value.trim() ? value : fallback;
}

export function buildInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
