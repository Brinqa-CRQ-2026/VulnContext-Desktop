# Backend File Layout

This is the current backend file split overview.

## Main entry

- `backend/app/main.py`
  Creates the FastAPI app, configures CORS, registers routers, and serves the built frontend when present.

## API routers

- `backend/app/api/findings.py`
  Findings list, summary, top findings, and finding detail routes.

- `backend/app/api/topology.py`
  Business-unit-first topology routes plus asset list/detail/findings drill-down.

- `backend/app/api/sources.py`
  Read-only source summary route.

- `backend/app/api/common.py`
  Shared API helpers for filtering, sorting, and response mapping.

- `backend/app/api/__init__.py`
  Central router export list used by `main.py`.

## Core backend logic

- `backend/app/models.py`
  SQLAlchemy models for thin findings/assets plus normalized topology tables.

- `backend/app/schemas.py`
  FastAPI response schemas.

- `backend/app/services/brinqa_detail.py`
  Placeholder Brinqa detail service interface. Current runtime returns no live Brinqa detail.

- `backend/app/services/topology.py`
  Exact-name topology FK backfill helper.

## Database and config

- `backend/app/core/db.py`
  Database engine and session dependency.

- `backend/app/core/env.py`
  Backend environment loading.

## Script workflow docs

- `docs/backend/current/asset-pull-workflow.md`
  Overview of the Brinqa export scripts and CSV outputs.

## Legacy reference docs

- `docs/backend/legacy/legacy-risk-weights.md`
- `docs/backend/legacy/legacy-source-management.md`
- `docs/backend/legacy/legacy-csv-import.md`
- `docs/backend/legacy/legacy-disposition-events.md`
- `docs/backend/legacy/legacy-epss-enrichment.md`
- `docs/backend/legacy/legacy-nvd-enrichment.md`
- `docs/backend/legacy/legacy-kev-enrichment.md`
- `docs/backend/legacy/legacy-asset-graph.md`
  These preserve removed or deferred backend capabilities for future rebuilds.

- `docs/backend/current/brinqa-detail-plan.md`
  Future implementation notes for Brinqa request-time detail enrichment.
