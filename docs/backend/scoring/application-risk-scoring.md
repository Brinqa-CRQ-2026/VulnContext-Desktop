# CRQ Application Scoring V4

Application CRQ v4 rolls scored supporting assets into `public.applications`.

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

`crq_application_aggregated_asset_risk = (0.50 * weighted_asset_average) + (0.30 * max_asset_risk) + (0.20 * asset_burden_score)`

`asset_weight = log(1 + asset_finding_count)`

`weighted_asset_average = sum(asset_risk_score * asset_weight) / sum(asset_weight)`

`asset_burden_score = log(1 + total_asset_risk) / log(1 + scored_asset_count * 10) * 10`

If scored assets exist but all asset weights are zero, the aggregate is `0.0`.

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
