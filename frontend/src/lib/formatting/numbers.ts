export function formatNumber(
  value?: number | null,
  digits = 1,
  fallback = "-"
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return value.toFixed(digits);
}

export function formatNullableNumber(
  value?: number | null,
  digits = 1,
  fallback = "-"
) {
  return formatNumber(value, digits, fallback);
}
