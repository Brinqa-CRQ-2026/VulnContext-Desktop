# Backend Overview

## Summary

The backend is a read-oriented FastAPI service over Supabase-backed tables. The current runtime exposes:

- legacy root routes such as `/findings` and `/assets`
- versioned routes under `/api/v1`
- read-only data access plus explicit enrichment routes
- manual scoring and export workflows through scripts

`services/fair/` remains separate and is not part of this docs set.

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
- [Manual Workflows](../workflows/manual.md)
- [Automation Workflows](../workflows/automation.md)
- [Test Matrix](../testing/README.md)

