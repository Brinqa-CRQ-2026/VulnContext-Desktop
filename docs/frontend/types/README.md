# Frontend Types

## Summary

Frontend types live in `frontend/src/types` and mirror backend response schemas plus small shared UI/query primitives. Backend schemas remain the source of truth.

## Type Modules

| File | Purpose |
| --- | --- |
| `frontend/src/types/api.ts` | backend response DTOs and API wrappers such as findings, sources, FAIR, and controls |
| `frontend/src/types/topology.ts` | topology, asset, business-unit, business-service, and application shapes |
| `frontend/src/types/findings.ts` | finding query, sort, route-origin, and filter types |
| `frontend/src/types/pagination.ts` | pagination primitives |
| `frontend/src/types/risk.ts` | shared risk-band primitives |
| `frontend/src/types/charts.ts` | chart distribution primitives |

## Rules

- Add backend response fields only after the backend schema/API returns them.
- Prefer shared DTOs from `frontend/src/types`; do not define new DTOs in `frontend/src/api/types.ts`.
- Keep component-only prop types local unless they are reused.
- When a type changes, update API tests, hook tests, and component tests that exercise that contract.

## Related Docs

- [Data Contracts](../api/data-contracts.md)
- [Backend API Reference](../../backend/api/README.md)
- [Frontend API Tests](../testing/api-tests.md)
