# CRQ Scoring Tests

## Files

- `backend/tests/services/scoring/test_crq_finding_scoring.py`
- `backend/tests/services/scoring/test_crq_asset_scoring.py`
- `backend/tests/services/scoring/test_crq_application_scoring.py`
- `backend/tests/services/scoring/test_crq_business_service_scoring.py`

## Backend Coverage

- `backend/app/services/crq_finding_scoring.py`
- `backend/app/services/crq_asset_scoring.py`
- `backend/app/services/crq_application_scoring.py`
- `backend/app/services/crq_business_service_scoring.py`
- shared rollup helpers in `backend/app/services/crq_rollup_scoring.py`

## Cases Covered

- Finding scoring persists CRQ values, bands, version, timestamps, NVD CVSS, EPSS multipliers, KEV bonus, and missing-data notes.
- Asset scoring covers aggregated finding risk, weighted severity average, severity burden, environment/tag handling, exposure, sensitivity, asset type, context score, final asset risk, targeting, and no-finding behavior.
- Application scoring covers aggregated asset risk, null handling, finding-count weighting, PCI/PII compliance score, bounded final risk, persistence, timestamps, empty applications, and targeting.
- Business-service scoring covers application rollups, direct-asset rollups, null handling, direct/application combination rules, asset/finding/application counts, malformed criticality labels, priority score fallback, business-unit rollup, and targeted entrypoint behavior.

## Not Covered Here

- API endpoints that expose scoring output; those are covered through findings/topology API tests.
- Manual scoring scripts and automation entrypoints.
- Postgres-only SQL behavior beyond what SQLite can execute in the test database.
