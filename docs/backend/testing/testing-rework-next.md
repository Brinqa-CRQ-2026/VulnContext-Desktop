# Backend Testing Rework Next Steps

Use this as the next-pass checklist after the test reorg is pushed.

## Add Missing Coverage

- Add FAIR endpoint tests for finding, asset, application, and business-service loss prediction.
- Add controls/security-score tests for score calculation, default current assessment, Supabase success, missing env `503`, and Supabase failure `502`.
- Add focused service tests for `security_score.py` and FAIR scope/loss prediction behavior.

## Improve Confidence

- Keep coverage report-only until FAIR and controls are covered.
- Re-run `pytest backend/tests --cov=backend/app --cov-report=term-missing -q` after new tests.
- Consider a coverage gate only after the known gaps are closed.

## Current Known Weak Areas

- FAIR services and FAIR routes.
- Controls/Supabase persistence routes.
- Brinqa external detail internals.
- Postgres-specific behavior not covered by SQLite tests.
