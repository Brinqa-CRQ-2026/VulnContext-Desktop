# Backend Review Overview

## Runtime shape

The backend is currently a read-heavy FastAPI service over persisted Supabase-style tables.

The main responsibilities are:

- findings retrieval and summary
- topology drill-down
- source summary reporting
- best-effort detail hydration from persisted enrichment tables and optional Brinqa detail calls
- manual CRQ rescoring through scripts and service helpers

## Important constraints

- The current API is intentionally narrower than earlier iterations of the product.
- CSV import, source mutation, analyst disposition writes, and risk-weight editing are not active backend capabilities.
- Manual operations happen through `backend/scripts/`, not through frontend write flows.

## Supporting services

- `brinqa_detail.py`
  Hydrates extra asset/finding detail when enough local identifiers or Brinqa credentials are available.
- `crq_scoring.py`
  Implements the CRQ model currently labeled `v4`.
- `topology.py`
  Backfills topology foreign keys during reseed flows.
