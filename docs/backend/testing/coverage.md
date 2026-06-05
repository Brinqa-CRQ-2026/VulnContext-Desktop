# Backend Coverage Reporting

## Tooling

Backend coverage uses `pytest-cov`, configured by `.coveragerc`.

Coverage currently measures:

- `backend/app`

Coverage currently omits:

- `backend/tests`
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

Coverage is report-only. Do not add an enforced threshold until missing FAIR and controls tests are implemented. A threshold before those tests would mostly encode known gaps rather than improve quality.
