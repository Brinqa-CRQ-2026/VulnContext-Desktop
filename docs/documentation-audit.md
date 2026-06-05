# Documentation Audit

## Summary

This page records the current documentation split, cleanup rules, and remaining
documentation or implementation gaps.

## Current Split

| Area | Path | Purpose |
| --- | --- | --- |
| Business | `docs/business/` | Sponsor-facing scoring and adoption narrative |
| Scoring | `docs/scoring/` | Canonical CRQ formulas, rollups, and scoring methodology |
| Backend | `docs/backend/` | FastAPI, Supabase, FAIR, workflows, and backend tests |
| Frontend | `docs/frontend/` | React/Electron architecture, API contracts, state, UI, runtime, and tests |
| Topology seed | `docs/backend/topology-seed/` | Seed CSV and SQL files |

## Cleanup Completed

- Removed the redundant `docs/backend/current/` layer.
- Removed legacy backend documentation.
- Split flat frontend docs into focused folders.
- Added a scoring index under `docs/scoring/`.
- Updated the scoring docs to document unified remediation priority as the
  target finding-level ranking methodology.
- Updated company scoring methodology as a target average of business unit risk
  and priority, while keeping implementation status explicit.

## Remaining Gaps

Unified remediation priority is documented but not fully implemented.

- No persisted finding-level priority field exists yet.
- Backend scoring, migrations, API fields, and UI sorting still need follow-up
  implementation.

Company scoring is documented as target methodology but not implemented.

- No company-level CRQ score fields exist.
- No company scoring entrypoint exists.

The FAIR docs are technical and may not be adoption-ready.

- They explain the loss prediction pipeline, controls, frequency, and magnitude.
- If FAIR is part of the sponsor pitch, add a business-facing FAIR overview
  under `docs/business/`.

## Ownership Rules

- Keep sponsor-facing scoring narrative in `docs/business/`.
- Keep canonical formula detail and rollup explanation in `docs/scoring/`.
- Keep code-specific backend implementation references in `docs/backend/`.
- Keep UI implementation references in `docs/frontend/`.
- Delete superseded legacy documentation unless it is actively needed for a
  migration.
