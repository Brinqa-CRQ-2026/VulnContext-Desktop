# CRQ Asset Scoring V2

Asset CRQ v2 is the current manual-run asset scoring model for `public.assets`.

The scorer keeps three distinct asset-layer signals:

- `crq_asset_aggregated_finding_risk`: vulnerability pressure from scored findings on a `0-10` scale
- `crq_asset_context_score`: exposure-adjusted business and technical context on a `0-10` scale
- `crq_asset_risk_score`: final active asset risk on a `0-10` scale

The underlying context components are normalized `0-1` modifiers:

- `crq_asset_exposure_score`
- `crq_asset_data_sensitivity_score`
- `crq_asset_environment_score`
- `crq_asset_type_score`

Context alone does not create asset risk in v2. Assets with no CRQ-scored findings receive `crq_asset_aggregated_finding_risk = 0.0` and `crq_asset_risk_score = 0.0`, while still receiving context component scores.

## Aggregated Finding Risk

The scorer uses persisted `findings.crq_finding_score` only. Missing `crq_finding_score` values are excluded.

Formula:

`crq_asset_aggregated_finding_risk = 0.5 * max_score + 0.3 * top_k_avg + 0.2 * log_scaled_component`

The result is clamped to `0-10` and rounded to two decimals.

This keeps vulnerability pressure balanced across:

- the worst finding
- the average of the top findings
- finding volume without allowing low findings to dominate

## Asset Context Score

`crq_asset_context_score` is not pure criticality. It represents exposure-adjusted business context:

- exposure
- data sensitivity
- environment importance
- asset role/type importance

Formula:

`crq_asset_context_score = 10 * ((0.35 * crq_asset_exposure_score) + (0.30 * crq_asset_data_sensitivity_score) + (0.20 * crq_asset_environment_score) + (0.15 * crq_asset_type_score))`

The multiplier by `10` intentionally promotes normalized `0-1` components into the product-facing `0-10` context score.

Component rules:

- exposure uses `public_ip_addresses` first, then `internal_or_external`
- data sensitivity uses `pci` and `pii`; `compliance_flags` is not part of v2 scoring
- environment uses the persisted `assets.environment`
- asset type primarily uses normalized `device_type`; generic `category` values such as `Host` do not raise the score

## Final Asset Risk

Formula:

`crq_asset_risk_score = crq_asset_aggregated_finding_risk * (0.7 + (0.3 * crq_asset_context_score / 10))`

If `crq_asset_aggregated_finding_risk <= 0`, then `crq_asset_risk_score = 0.0`.

The context multiplier ranges from `0.7` to `1.0`, so finding risk remains the primary driver and final asset risk never exceeds aggregated finding risk.

## Persisted Fields

The scorer writes these columns on `public.assets`:

- `crq_asset_aggregated_finding_risk`
- `crq_asset_exposure_score`
- `crq_asset_data_sensitivity_score`
- `crq_asset_environment_score`
- `crq_asset_type_score`
- `crq_asset_context_score`
- `crq_asset_risk_score`
- `crq_asset_scored_at`
