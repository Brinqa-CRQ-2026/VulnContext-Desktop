# CRQ Application Scoring V1

Application CRQ v1 rolls scored supporting assets into `public.applications`.

The scorer keeps three application-layer score signals, all on a product-facing `0-10` scale:

- `crq_application_aggregated_asset_risk`
- `crq_application_compliance_score`
- `crq_application_risk_score`

Counts are persisted separately as raw counts:

- `crq_application_asset_count`
- `crq_application_finding_count`

## Aggregated Asset Risk

The scorer uses persisted `assets.crq_asset_risk_score` only. Missing asset risk scores are excluded.

Formula:

`crq_application_aggregated_asset_risk = 0.5 * max_asset_risk + 0.3 * top_5_asset_risk_avg + 0.2 * log_scaled_asset_component`

`log_scaled_asset_component = log(1 + total_asset_risk) / log(1 + scored_asset_count * 10) * 10`

The result is clamped to `0-10` and rounded to two decimals. Applications with no scored supporting assets receive `0.0`.

## Compliance Score

Compliance is derived from application `tags` using PCI/PII tags only, then expressed as a `0-10` score:

- PCI and PII => `10.0`
- PCI or PII => `8.0`
- null tags => `4.0`
- empty or no PCI/PII tags => `2.0`

## Final Application Risk

Formula:

`crq_application_risk_score = crq_application_aggregated_asset_risk * (0.7 + (0.3 * crq_application_compliance_score / 10))`

If `crq_application_aggregated_asset_risk <= 0`, then `crq_application_risk_score = 0.0`.

The compliance multiplier ranges from `0.7` to `1.0`, so supporting asset risk remains the primary driver and final application risk never exceeds aggregated asset risk.
