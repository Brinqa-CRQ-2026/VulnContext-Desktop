# Scoring Model

The current backend supports a persisted app-owned finding score: CRQ v4.

## Runtime behavior

- prefers `findings.crq_score` as the display `risk_score` when present
- falls back to `findings.brinqa_risk_score` when CRQ has not been run yet
- keeps Brinqa visible as `source_risk_score` for comparison
- derives display risk bands from the active display score
- keeps finding-level metric labels simple in the API and UI:
  - `CVSS`
  - `EPSS`
  - `KEV`
  while sourcing them from CRQ fields first

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

`crq_score = min(10, (cvss_score * 0.88) + epss_adjustment + kev_bonus)`

Run commands:

- `make score-crq`
- `make score-crq-v4`
- `make score-crq-preview`

## Summary and Detail Exposure

Finding summaries and finding detail now expose CRQ-first metric fields for:

- `risk_score`
- `cvss_score`
- `epss_score`
- `isKev`

Fallback order:

1. persisted `crq_*` fields on `findings`
2. local enrichment tables by `cve_id`
3. raw source fields when no app-owned value exists

Full persisted-field details and band tables live in [crq-scoring-v4.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/crq-scoring-v4.md).
