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

Coverage is intentionally report-only for now. There is no enforced percentage gate until the FAIR and controls gaps are covered.

## Test Areas

| Area | Test files | Details |
| --- | --- | --- |
| API contracts | `backend/tests/api/` | [api-tests.md](api-tests.md) |
| Topology API contracts | `backend/tests/api/topology/` | [topology-tests.md](topology-tests.md) |
| CRQ scoring services | `backend/tests/services/scoring/` | [scoring-tests.md](scoring-tests.md) |
| Data contracts | `backend/tests/data_contracts/` | [data-contract-tests.md](data-contract-tests.md) |
| Architecture checks | `backend/tests/architecture/` | [architecture-tests.md](architecture-tests.md) |
| Coverage reporting | `.coveragerc`, `pytest-cov` | [coverage.md](coverage.md) |
| Known gaps | untested or partial areas | [coverage-gaps.md](coverage-gaps.md) |

## Current Position

The suite is strong around CRQ scoring persistence, topology browsing, asset browsing, findings reads, and asset enrichment contracts. The highest-priority missing production coverage is FAIR loss prediction and controls/security-score persistence.
