# Backend Overview

## Summary

The backend is a read-oriented FastAPI service over Supabase-backed tables. The current runtime exposes:

- legacy root routes such as `/findings` and `/assets`
- versioned routes under `/api/v1`
- read-mostly data access plus FAIR loss and controls endpoints
- manual scoring and export workflows through scripts

Legacy Brinqa live-fetch enrichment code lives under `backend/legacy/` and is not part of the active HTTP surface.

## Request Flow

1. `backend/app/api/` handles HTTP routing, query/path/body inputs, dependency wiring, and response model declarations.
2. `backend/app/services/` handles orchestration, response shaping, CRQ scoring jobs, FAIR workflows, and domain decisions.
3. `backend/app/repositories/` handles reusable SQLAlchemy query construction and database lookup helpers.
4. `backend/app/models.py` defines SQLAlchemy ORM models for Supabase-backed tables.
5. `backend/app/schemas.py` defines Pydantic request and response contracts.

Supabase is used as the Postgres database provider. The FastAPI backend talks to that database through SQLAlchemy sessions from `backend/app/core/db.py`.

## Service Layout

- `backend/app/services/views/` contains read-model services for findings and sources plus shared response mappers.
- `backend/app/services/topology/` contains business-unit, business-service, application, asset, analytics, and topology maintenance workflows.
- `backend/app/services/scoring/` contains CRQ scoring jobs and rollup helpers used by manual scripts.
- `backend/app/services/fair/` contains FAIR loss prediction and control modeling.
- `backend/app/services/security_score.py` contains the controls security-score helper logic.

## What To Read Next

- [API Reference](api/README.md)
- [Architecture Map](architecture/README.md)
- [Detailed Backend Architecture](architecture/backend-architecture.md)
- [Database Reference](architecture/database.md)
- [Scoring Overview](scoring/README.md)
- [FAIR Overview](fair/README.md)
- [Manual Workflows](workflows/manual.md)
- [Automation Workflows](workflows/automation.md)
- [Test Matrix](testing/README.md)
