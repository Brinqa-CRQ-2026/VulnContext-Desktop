# CRQ Asset Scoring V1

Asset CRQ v1 is the current manual-run asset scoring model for `public.assets`.

This scorer writes two downstream inputs without combining them into a final asset risk yet:

- `crq_asset_aggregated_finding_risk` in the `0-10` range
- `crq_asset_context_score` in the `0-10` range

It also persists the component fields used to explain `crq_asset_context_score`:

- `crq_asset_exposure_score`
- `crq_asset_data_sensitivity_score`
- `crq_asset_environment_score`
- `crq_asset_type_score`

## Aggregated Finding Risk

The scorer uses persisted `findings.crq_finding_score` only. Missing `crq_finding_score` values are excluded.

Formula:

`crq_asset_aggregated_finding_risk = 0.5 * max_score + 0.3 * top_k_avg + 0.2 * log_scaled_component`

If an asset has no CRQ-scored findings, `crq_asset_aggregated_finding_risk = 0.0`.

## Asset Context Score

Formula:

`crq_asset_context_score = 10 * ((0.35 * crq_asset_exposure_score) + (0.30 * crq_asset_data_sensitivity_score) + (0.20 * crq_asset_environment_score) + (0.15 * crq_asset_type_score))`

Component rules:

- exposure uses `public_ip_addresses` first, then `internal_or_external`
- data sensitivity uses `pci`, `pii`, then `compliance_flags`
- environment uses the persisted `assets.environment`
- asset type uses `device_type` first, then `category`

## Persisted Fields

The scorer writes these columns on `public.assets`:

- `crq_asset_aggregated_finding_risk`
- `crq_asset_exposure_score`
- `crq_asset_data_sensitivity_score`
- `environment`
- `crq_asset_environment_score`
- `crq_asset_type_score`
- `crq_asset_context_score`
- `crq_asset_scored_at`

`crq_asset_risk_score` remains present in the schema for later pipeline work, but v1 intentionally leaves it unpopulated.

