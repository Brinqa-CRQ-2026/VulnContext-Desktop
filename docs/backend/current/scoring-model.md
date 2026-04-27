# Scoring Model

The current backend supports:

- a persisted app-owned finding score: CRQ v4
- a persisted asset context score: asset CRQ v1

## Runtime behavior

- prefers `findings.crq_finding_score` as the display `risk_score` when present
- falls back to `findings.brinqa_risk_score` when CRQ has not been run yet
- keeps Brinqa visible as `source_risk_score` for comparison
- derives display risk bands from the active display score
- keeps finding-level metric labels simple in the API and UI:
  - `CVSS`
  - `EPSS`
  - `KEV`
  while sourcing them from persisted `crq_*` fields only

Current thresholds:

- `>= 9.0` => `Critical`
- `>= 7.0` => `High`
- `>= 4.0` => `Medium`
- `< 4.0` => `Low`

## CRQ v4

- local enrichment only
- no Brinqa score input in the formula
- manual-run only
- requires the tracked Supabase migration before the scorer writes data
- age is persisted for reference only and is excluded from the score
- EPSS contributes a small bounded negative or positive adjustment
- CVSS remains the primary driver through a fixed `0.88` weight

Formula:

`crq_finding_score = min(10, (cvss_score * 0.88) + epss_adjustment + kev_bonus)`

Run commands:

- `make score-crq`
- `make score-crq-findings`
- `make score-crq-v4`
- `make score-crq-preview`

## Summary and Detail Exposure

Finding summaries and finding detail now expose CRQ-first metric fields for:

- `risk_score`
- `cvss_score`
- `epss_score`
- `isKev`

If those persisted values are absent on a finding row, the backend returns `null` rather than enriching them during response handling.

Full persisted-field details and band tables live in [crq-finding-scoring-v4.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/crq-finding-scoring-v4.md).

## Asset CRQ v1

- manual-run only
- uses persisted `findings.crq_finding_score` only when aggregating asset finding risk
- computes and persists exactly two asset-level outputs for downstream use:
  - `crq_asset_aggregated_finding_risk`
  - `crq_asset_context_score`
- does not compute a combined/final `crq_asset_risk_score` yet

Run commands:

- `make score-assets`
- `make score-crq-assets`

The scorer also persists the explainable component fields:

- `crq_asset_exposure_score`
- `crq_asset_data_sensitivity_score`
- `crq_asset_environment_score`
- `crq_asset_type_score`

Full asset-field details, formula notes, and example output live in [crq-asset-scoring-v1.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/crq-asset-scoring-v1.md).
