# Backend API Reference

## Summary

This folder documents the active HTTP surface. The same routers are mounted at:

- `/api/v1/...`
- the legacy root paths, for compatibility during migration

## Route Groups

| Group | Routes | Doc |
| --- | --- | --- |
| Findings | `/findings/top`, `/findings/summary`, `/findings`, `/findings/{finding_id}`, `/findings/{finding_id}/fair-loss` | [Findings](findings.md) |
| Topology and assets | `/topology/business-units*`, `/assets*` | [Topology And Assets](topology-and-assets.md) |
| Controls | `/controls/security-score`, `/controls/current`, `/controls/save`, `/controls/saved/latest` | [FAIR Frontend/Backend Contract](../fair/frontend-backend-contract.md) |
| Sources | `/sources` | [Sources](sources.md) |

## Common Notes

- `GET /health` returns `{ "status": "ok" }`
- `GET /api/v1/health` is an alias of `/health`
- findings, sources, and topology browse routes are read-only
- controls and FAIR loss routes perform request-scoped calculation or mocked/persisted controls state
- normalized topology routes return `503` until the topology expansion schema exists
