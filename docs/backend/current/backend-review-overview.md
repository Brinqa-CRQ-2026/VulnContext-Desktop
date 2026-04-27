# Backend Review Overview

## Runtime shape

The backend is currently a read-heavy FastAPI service over persisted Supabase-style tables.

The main responsibilities are:

- findings retrieval and summary
- topology drill-down
- source summary reporting
- persisted-data findings/detail responses plus explicit opt-in Brinqa enrichment routes
- manual CRQ rescoring through scripts and service helpers

## Important constraints

- The current API is intentionally narrower than earlier iterations of the product.
- CSV import, source mutation, analyst disposition writes, and risk-weight editing are not active backend capabilities.
- Manual operations happen through `backend/scripts/`, not through frontend write flows.

## Supporting services

- `brinqa_detail.py`
  Hydrates request-scoped Brinqa asset detail and explicit finding narrative enrichment.
- `crq_finding_scoring.py`
  Implements the CRQ Findings model currently labeled `v4`.
- `crq_asset_scoring.py`
  Implements the manual-run CRQ Asset model for aggregated finding risk and asset context.
- `topology.py`
  Backfills topology foreign keys during reseed flows.
