# Backend Docs

## Summary

Backend docs describe the current FastAPI service, Supabase-backed data model,
API surface, CRQ scoring implementation, FAIR pipeline, operational workflows,
and backend test coverage.

## Start Here

- [Overview](overview/README.md)
- [API Reference](api/README.md)
- [Architecture Map](architecture/README.md)
- [Backend Scoring Overview](scoring/README.md)
- [Canonical CRQ Scoring Reference](../scoring/crq-scoring-and-rollups.md)

## Documents

| Area | Path | Purpose |
| --- | --- | --- |
| Overview | [overview/](overview/README.md) | Runtime summary and request flow |
| API | [api/](api/README.md) | Active HTTP routes and response behavior |
| Architecture | [architecture/](architecture/README.md) | Backend layers and database reference |
| Scoring | [scoring/](scoring/README.md) | Code-specific CRQ scoring implementation references |
| FAIR | [fair/](fair/README.md) | FAIR-style loss prediction pipeline and frontend/backend contract |
| Workflows | [workflows/](workflows/README.md) | Manual scripts and automation workflows |
| Testing | [testing/](testing/README.md) | Backend test matrix and behavior coverage |
| Topology Seed | [topology-seed/](topology-seed/) | Seed CSV and SQL files for normalized topology |

## Ownership

Backend docs are implementation docs. Business/adoption narrative belongs in
`docs/business/`, while canonical CRQ formula detail belongs in `docs/scoring/`.
