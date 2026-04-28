# Asset Context Scoring V1

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

Where:

- `max_score = max(finding_scores)`
- `k = min(5, number_of_findings)`
- `top_k_avg = average(top k highest finding scores)`
- `log_scaled_component = (log(1 + total_score) / log(1 + number_of_findings * 10)) * 10`

If an asset has no CRQ-scored findings, `crq_asset_aggregated_finding_risk = 0.0`.

This keeps the score sensitive to severe findings, moderately sensitive to clusters of severe findings, and only mildly sensitive to raw finding volume.

## Asset Context Score

Formula:

`crq_asset_context_score = 10 * ((0.35 * crq_asset_exposure_score) + (0.30 * crq_asset_data_sensitivity_score) + (0.20 * crq_asset_environment_score) + (0.15 * crq_asset_type_score))`

Component rules:

- `crq_asset_exposure_score`
  - non-empty `public_ip_addresses` => `1.0`
  - else `internal_or_external = External` => `1.0`
  - else `internal_or_external = Internal` => `0.6`
  - else => `0.8`
- `crq_asset_data_sensitivity_score`
  - `pci = true` and `pii = true` => `1.0`
  - `pci = true` or `pii = true` => `0.8`
  - non-empty `compliance_flags` => `0.6`
  - else => `0.2`
- `crq_asset_environment_score`
  - uses persisted `assets.environment`
  - `production` => `1.0`
  - `test` => `0.7`
  - `development` => `0.4`
  - `unknown` or null => `0.6`
- `crq_asset_type_score`
  - `Network`, `Router`, or `Firewall` => `1.0`
  - `Database` => `0.9`
  - `Server` => `0.8`
  - `Cloud server` => `0.7`
  - `Workstation` => `0.5`
  - otherwise => `0.6`

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

## Run

From repo root:

```bash
make score-assets
```

Direct script usage:

```bash
cd backend
python3 scripts/score_crq_assets_v1.py
```

Target a subset of assets:

```bash
cd backend
python3 scripts/score_crq_assets_v1.py --asset-id asset-123 --asset-id asset-456
```

## Example

Sample asset input:

```python
asset = {
    "internal_or_external": "External",
    "public_ip_addresses": "203.0.113.5",
    "pci": True,
    "pii": False,
    "compliance_flags": "SOX",
    "environment": "production",
    "device_type": "Firewall",
    "category": "Host",
}
finding_scores = [9.4, 7.6, 2.5]
```

Example outputs:

- `crq_asset_aggregated_finding_risk = 8.41`
- `crq_asset_context_score = 9.4`

The example shows the intended behavior:

- the finding score stays dominated by the severe findings instead of raw count
- the asset context score stays explainable through the four weighted technical factors
- no final combined asset risk is calculated in this version
