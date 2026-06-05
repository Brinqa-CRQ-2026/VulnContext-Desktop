# Backend Coverage Reporting

## Tooling

Backend coverage uses `pytest-cov`, configured by `.coveragerc`.

Coverage currently measures:

- `backend/app`

Coverage currently omits:

- `backend/tests`
- `backend/legacy`
- Python cache files

## Commands

Run tests only:

```bash
pytest backend/tests -q
```

Run tests with missing-line coverage:

```bash
pytest backend/tests --cov=backend/app --cov-report=term-missing
```

## Policy

Coverage is report-only. The FAIR, controls, security-score, and CRQ edge tests now cover the largest previously documented gaps, but the suite still relies on SQLite and mocked external services.

Do not add an enforced threshold until the team decides which production-only areas, such as Supabase/Postgres behavior and legacy code, should be excluded from the gate.
