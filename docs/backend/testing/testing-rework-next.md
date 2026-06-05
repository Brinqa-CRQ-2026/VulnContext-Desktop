# Backend Testing Rework Next Steps

Use this as the next-pass checklist after the FAIR, controls, and CRQ edge coverage pass.

## Recently Completed Coverage

- FAIR endpoint tests for finding, asset, application, and business-service loss prediction.
- Controls/security-score tests for score calculation, default current assessment, Supabase success, missing env `503`, and Supabase failure `502`.
- Focused service tests for `security_score.py`, FAIR internals, and loss prediction.
- CRQ rollup and CRQ finding schema edge tests.

## Improve Confidence

- Keep coverage report-only until production-only exclusions and thresholds are agreed.
- Re-run `pytest backend/tests --cov=backend/app --cov-report=term-missing -q` after new tests.
- Consider a coverage gate after live Supabase/Postgres expectations are separated from unit coverage.

## Current Known Weak Areas

- Live Supabase behavior and row-level security.
- Postgres-specific behavior not covered by SQLite tests.
- High-iteration FAIR simulation latency/statistical confidence.
- Legacy Brinqa external detail internals under `backend/legacy/`.
