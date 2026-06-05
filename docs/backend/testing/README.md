# Backend Testing

The backend test suite is organized by the backend layer or contract it protects.

## Quick Commands

Run all backend tests:

```bash
pytest backend/tests -q
```

Run backend tests with a report-only coverage summary:

```bash
pytest backend/tests --cov=backend/app --cov-report=term-missing
```

Coverage is intentionally report-only for now. There is no enforced percentage gate while production-only Supabase/Postgres behavior is still separated from unit coverage.

## Test Areas

| Area | Test files | Details |
| --- | --- | --- |
| API contracts | `backend/tests/api/` | [api-tests.md](api-tests.md) |
| Topology API contracts | `backend/tests/api/topology/` | [topology-tests.md](topology-tests.md) |
| CRQ scoring services | `backend/tests/services/scoring/` | [scoring-tests.md](scoring-tests.md) |
| FAIR, controls, and security score | FAIR/controls API and service tests | [fair-and-controls-tests.md](fair-and-controls-tests.md) |
| Data contracts | `backend/tests/data_contracts/` | [data-contract-tests.md](data-contract-tests.md) |
| Architecture checks | `backend/tests/architecture/` | [architecture-tests.md](architecture-tests.md) |
| Coverage reporting | `.coveragerc`, `pytest-cov` | [coverage.md](coverage.md) |
| Known gaps | untested or partial areas | [coverage-gaps.md](coverage-gaps.md) |

## Current Position

The suite is strong around CRQ scoring persistence, CRQ rollups, topology browsing, asset browsing, findings reads, FAIR loss prediction, controls persistence contracts, and security-score internals.

Brinqa live-fetch enrichment is not part of the active backend test target. That implementation lives under `backend/legacy/` and is omitted from backend coverage.
