# Backend Review Overview

This is the short version of where backend logic lives in the current backend.

## High-Level Split

- `main.py`: app startup and router registration
- `api/`: HTTP endpoints
- `api/common.py`: shared API-layer helpers
- `core/`: database/session/config helpers
- `services/`: placeholder Brinqa detail interface and topology backfill support

## Active Backend Responsibilities

### App startup

- `backend/app/main.py`
  Creates the FastAPI app, configures CORS, registers routers, and serves the built frontend when present.

### API routes

- `backend/app/api/findings.py`
  Read-only findings routes:
  - findings summary
  - top findings
  - paginated findings list
  - single finding detail

- `backend/app/api/topology.py`
  Business-unit-first topology and asset drill-down routes:
  - business-unit list
  - business-unit detail
  - business-service detail
  - application detail
  - asset list/detail
  - asset-scoped findings

- `backend/app/api/sources.py`
  Read-only source summary route.

### Shared API logic

- `backend/app/api/common.py`
  Shared helpers for:
  - derived risk-band logic
  - findings sorting and filtering
  - mapping ORM rows into API response schemas
  - asset and finding response shaping

### Database and configuration

- `backend/app/core/db.py`
  Database URL resolution, SQLAlchemy engine/session setup, and FastAPI DB dependency.

- `backend/app/core/env.py`
  Backend `.env` loading.

### Data models and contracts

- `backend/app/models.py`
  SQLAlchemy models for:
  - thin `assets`
  - thin `findings`
  - normalized topology tables: `companies`, `business_units`, `business_services`, `applications`

- `backend/app/schemas.py`
  FastAPI response models for findings, topology, assets, and sources.

### Detail hydration and topology support

- `backend/app/services/brinqa_detail.py`
  Placeholder Brinqa detail service interface.
  It currently returns no live detail and exists only so a future implementation can be added without changing route code again.

- `backend/app/services/topology.py`
  Exact-name topology FK backfill helper for assets.

## Current Request Flow

### Findings

The findings flow lives in `backend/app/api/findings.py`.

It:

- queries thin finding rows from the database
- derives risk bands from `brinqa_risk_score`
- joins asset context where needed
- returns thin persisted finding rows only in the current runtime

### Topology and assets

The topology and asset flow lives in `backend/app/api/topology.py`.

It:

- reads normalized topology tables when they exist
- rolls up asset and finding counts for browse pages
- keeps `/assets` compatible with legacy text `business_service` and `application` filters during transition
- returns `503` on business-unit topology routes if the normalized topology schema has not been applied yet

## Simple Mental Model

- `main.py` starts the app
- `api/` exposes read routes
- `api/common.py` holds shared response and query helpers
- `models.py` defines the database tables the backend reads
- `schemas.py` defines the API contracts
- `services/` adds best-effort detail hydration and topology support
- `core/` handles DB sessions and env loading

## Important Non-Goals In The Current Backend

The current backend does not implement:

- CSV import routes
- risk weight management
- internal rescoring
- analyst disposition writes
- KEV/NVD/EPSS admin pipelines
- source rename/delete mutation routes
- live Brinqa detail enrichment
