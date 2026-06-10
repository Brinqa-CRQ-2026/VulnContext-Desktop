# Documentation

## Summary

Documentation is organized by audience and system area. Business docs explain
adoption and scoring concepts, scoring docs hold canonical formulas, backend
docs cover FastAPI/Supabase implementation, and frontend docs cover the
React/Electron renderer.

## Start Here

- [Sponsor Scoring Overview](business/sponsor-scoring-overview.md)
- [Technical Scoring Reference](scoring/technical-scoring-reference.md)
- [Backend Overview](backend/Overview.md)
- [Frontend Overview](frontend/Overview.md)
- [Backend Docs Index](backend/README.md)
- [Frontend Docs Index](frontend/README.md)

## Documents

| Area | Path | Purpose |
| --- | --- | --- |
| Business | [business/](business/README.md) | Sponsor and Brinqa-facing scoring and prioritization narrative |
| Scoring | [scoring/](scoring/README.md) | Canonical CRQ formulas, rollups, and scoring methodology |
| Backend | [backend/](backend/README.md) | FastAPI, Supabase, API, scoring implementation, workflows, and tests |
| Frontend | [frontend/](frontend/README.md) | React/Electron architecture, API contracts, state, UI, runtime, and tests |
| Governance | [documentation-audit.md](documentation-audit.md) | Documentation organization rules and remaining gaps |

## Ownership

- Put sponsor and adoption material in `docs/business/`.
- Put canonical scoring formulas and methodology in `docs/scoring/`.
- Put backend implementation details in `docs/backend/`.
- Put frontend implementation details in `docs/frontend/`.
- Do not keep superseded legacy material unless it is actively needed for a
  migration.
