# Scoring Model

The current backend does not implement an app-owned scoring model.

## What the runtime does today

- reads `brinqa_risk_score` from `public.findings`
- derives display risk bands directly from that vendor score

Current thresholds:

- `>= 9.0` => `Critical`
- `>= 7.0` => `High`
- `>= 4.0` => `Medium`
- `< 4.0` => `Low`

## What the runtime does not do

- no persisted internal score
- no risk-weight configuration
- no EPSS/NVD/KEV rescoring pipeline
- no analyst override scoring model

If richer scoring returns later, use the legacy scoring docs as reference only and reintroduce it intentionally rather than assuming the previous model is still active.
