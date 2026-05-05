# Backend API Reference

## Summary

This folder documents the active HTTP surface. The same routers are mounted at:

- `/api/v1/...`
- the legacy root paths, for compatibility during migration

## Route Groups

| Group | Routes | Doc |
| --- | --- | --- |
| Findings | `/findings/top`, `/findings/summary`, `/findings`, `/findings/{finding_id}`, `/findings/{finding_id}/enrichment` | [Findings](findings.md) |
| Topology and assets | `/topology/business-units*`, `/assets*` | [Topology And Assets](topology.md) |
| Sources | `/sources` | [Sources](sources.md) |

## Common Notes

- `GET /health` returns `{ "status": "ok" }`
- `GET /api/v1/health` is an alias of `/health`
- all active routes are read-only
- explicit enrichment routes are separate from persisted-detail routes
- normalized topology routes return `503` until the topology expansion schema exists

