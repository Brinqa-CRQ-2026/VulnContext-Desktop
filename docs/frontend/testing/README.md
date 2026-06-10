# Frontend Testing

## Summary

Frontend tests protect API request construction, hook state machines, page/component rendering, app routing, and shared utilities. They do not prove backend SQL/scoring math or browser layout behavior.

## Quick Commands

Run all frontend tests:

```bash
cd frontend && npm test
```

Run the production build:

```bash
cd frontend && npm run build
```

## Test Areas

| Area | Test files | Details |
| --- | --- | --- |
| API modules | `frontend/src/tests/api/` | [api-tests.md](api-tests.md) |
| Components | `frontend/src/tests/components/` | [component-tests.md](component-tests.md) |
| Hooks | `frontend/src/tests/hooks/` | [hook-tests.md](hook-tests.md) |
| App routing | `frontend/src/tests/app.test.tsx` | [app-routing-tests.md](app-routing-tests.md) |
| Utilities | `frontend/src/tests/lib/` | [utility-tests.md](utility-tests.md) |
| Known gaps | visual/browser/backend behavior | [coverage-gaps.md](coverage-gaps.md) |

## Current Position

The suite is strong around persisted-data rendering, topology drill-down navigation, table controls, finding detail behavior, API query construction, hook refresh/filter behavior, and read-only source displays.

Live Brinqa enrichment, backend scoring math, Supabase/Postgres behavior, and browser visual-regression layout are not frontend test targets.

## Related Docs

- [Frontend Overview](../Overview.md)
- [Components](../components/README.md)
- [Hooks](../hooks/README.md)
- [Data Contracts](../api/data-contracts.md)
