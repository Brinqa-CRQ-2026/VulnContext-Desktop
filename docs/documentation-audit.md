# Documentation Audit

## Summary

This page records the current documentation split, cleanup rules, completed
documentation cleanup, and remaining documentation gaps.

## Current Split

| Area | Path | Purpose |
| --- | --- | --- |
| Business | `docs/business/` | Sponsor and Brinqa-facing scoring and adoption narrative |
| Scoring | `docs/scoring/` | Canonical CRQ formulas, rollups, and scoring methodology |
| Backend | `docs/backend/` | FastAPI, Supabase, FAIR, workflows, and backend tests |
| Frontend | `docs/frontend/` | React/Electron architecture, API contracts, state, UI, runtime, and tests |
| Topology seed | `docs/backend/topology-seed/` | Seed CSV and SQL files |

## Cleanup Completed

- Removed the redundant `docs/backend/current/` layer.
- Removed legacy backend documentation.
- Split flat frontend docs into focused folders.
- Added a scoring index under `docs/scoring/`.
- Renamed the canonical scoring reference to
  `docs/scoring/technical-scoring-reference.md`.
- Renamed the sponsor scoring narrative to
  `docs/business/sponsor-scoring-overview.md`.
- Updated scoring docs to make unified remediation priority the finding-level
  remediation ranking model.
- Updated sponsor docs to use Cyber Risk Quantification / CRQ naming and avoid
  product-name-specific framing.
- Clarified that asset criticality is the aggregate asset context score backed
  by `crq_asset_context_score`, calculated from exposure, data sensitivity,
  environment, and asset type.
- Removed company scoring and service/unit priority from the sponsor-facing
  adoption narrative.

## Remaining Gaps

Scoring documentation is structurally clean.

- The technical reference owns formulas, fields, rollups, known limitations,
  and future improvements.
- The sponsor overview owns adoption framing, sponsor review questions, and
  data-quality/weight-tuning guidance.
- No separate company scoring gap is tracked in the scoring docs.

The remaining scoring documentation hole is sponsor calibration detail.

- The sponsor overview intentionally says sponsors should review asset
  criticality aggregation, compliance metadata, topology quality, weights, and
  mappings.
- If sponsors provide preferred weights or mappings, add those decisions to the
  technical scoring reference and summarize the business rationale in the
  sponsor overview.

The FAIR docs are technical and may not be adoption-ready.

- They explain the loss prediction pipeline, controls, frequency, and magnitude.
- If FAIR is part of the sponsor pitch, add a business-facing FAIR overview
  under `docs/business/`.

## Ownership Rules

- Keep sponsor and Brinqa-facing scoring narrative in `docs/business/`.
- Keep canonical formula detail and rollup explanation in `docs/scoring/`.
- Keep code-specific backend implementation references in `docs/backend/`.
- Keep UI implementation references in `docs/frontend/`.
- Delete superseded legacy documentation unless it is actively needed for a
  migration.
