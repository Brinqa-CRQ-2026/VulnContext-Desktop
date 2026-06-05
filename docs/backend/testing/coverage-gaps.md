# Backend Coverage Gaps

These gaps are known and should be handled in later test-addition or environment-specific validation passes.

## Recently Covered

- FAIR loss prediction endpoints for finding, asset, application, and business-service scopes.
- FAIR internal frequency, magnitude, controls, vulnerability, and loss-prediction paths.
- Controls/security-score calculation and mocked Supabase persistence routes.
- CRQ rollup helpers and CRQ finding schema edge behavior.

## Remaining Gaps

- Live Supabase behavior, including row-level security, network failures, and production auth configuration.
- Postgres-specific SQL behavior, constraints, query plans, and performance characteristics.
- High-iteration FAIR simulation confidence and latency under production-like workloads.
- Legacy Brinqa live-fetch internals under `backend/legacy/`.
- Manual scripts and automation entrypoints.
- End-to-end desktop runtime behavior across Electron, backend, and renderer.

## Environment Limits

- The suite uses SQLite for backend tests, so it does not fully prove Postgres/Supabase behavior.
- External services are mocked or outside active coverage.
- Coverage is not enforced yet.
