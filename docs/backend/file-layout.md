# Backend File Layout

This is the lightweight backend file split overview.

## Main entry

- `backend/app/main.py`
  Creates the FastAPI app, configures CORS, runs startup work, and registers all routers.

## API routers

- `backend/app/api/findings.py`
  Finding list, summary, top findings, finding detail, and disposition routes.

- `backend/app/api/sources.py`
  Source summary, source rename, and source delete routes.

- `backend/app/api/risk_weights.py`
  Read and update internal scoring weights.

- `backend/app/api/imports.py`
  CSV import route for staged findings uploads.

- `backend/app/api/admin.py`
  Admin-only operational routes, currently KEV reload.

- `backend/app/api/common.py`
  Shared API helpers used across routers, such as serialization, scoring helpers, filtering, and finding response mapping.

- `backend/app/api/__init__.py`
  Central router export list used by `main.py`.

## Core backend logic

- `backend/app/models.py`
  SQLAlchemy models for findings, configs, enrichment cache tables, and events.

- `backend/app/schemas.py`
  FastAPI request and response schemas.

- `backend/app/scoring.py`
  Internal risk scoring logic.

- `backend/app/seed.py`
  CSV parsing and finding import preparation.

- `backend/app/epss.py`
  EPSS refresh logic.

- `backend/app/services/nvd_enrichment.py`
  NVD cache ingest and CVE enrichment.

- `backend/app/services/kev_enrichment.py`
  KEV CSV parsing and KEV lookup.

## Database and config

- `backend/app/core/db.py`
  Database engine, session dependency, schema setup.

- `backend/app/core/env.py`
  Backend environment loading.

- `backend/app/core/risk_weights.py`
  Risk weight defaults and config helpers.
