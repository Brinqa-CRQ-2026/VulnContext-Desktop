# Backend Overview

## Summary

The backend is a read-oriented FastAPI service over Supabase-backed tables. The current runtime exposes:

- legacy root routes such as `/findings` and `/assets`
- versioned routes under `/api/v1`
- read-mostly data access plus FAIR loss and controls endpoints
- manual scoring and export workflows through scripts

Legacy Brinqa live-fetch enrichment code lives under `backend/legacy/` and is not part of the active HTTP surface.

## Request Flow

1. `backend/app/api/` handles HTTP routing and validation
2. `backend/app/services/` handles orchestration and response shaping
3. `backend/app/repositories/` handles database queries
4. `backend/app/models.py` defines ORM models
5. `backend/app/schemas.py` defines response contracts

## What To Read Next

- [API Reference](../api/README.md)
- [Architecture Map](../architecture/README.md)
- [Database Reference](../architecture/database.md)
- [Scoring Overview](../scoring/README.md)
- [FAIR Overview](../fair/README.md)
- [Manual Workflows](../workflows/manual.md)
- [Automation Workflows](../workflows/automation.md)
- [Test Matrix](../testing/README.md)
