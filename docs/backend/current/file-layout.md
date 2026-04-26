# Backend File Layout

## Active app modules

- `backend/app/main.py`
  FastAPI entrypoint, CORS setup, router registration, and built-frontend serving.
- `backend/app/api/findings.py`
  Read-only findings summary, list, top, and detail routes.
- `backend/app/api/topology.py`
  Business-unit-first topology, assets, and asset-findings drill-down routes.
- `backend/app/api/sources.py`
  Read-only source summary route.
- `backend/app/api/common.py`
  Shared mapping, sorting, and risk-band helpers.
- `backend/app/models.py`
  ORM models for findings, assets, topology tables, and enrichment tables.
- `backend/app/schemas.py`
  Response models used by the active API.
- `backend/app/core/db.py`
  Engine, session, and model base wiring.
- `backend/app/core/env.py`
  Environment loading for backend runtime.
- `backend/app/services/brinqa_detail.py`
  Best-effort detail hydration for findings and assets.
- `backend/app/services/topology.py`
  Topology foreign-key backfill helper used by reseed workflows.
- `backend/app/services/crq_scoring.py`
  Current CRQ v4 scoring logic over persisted enrichment data.

## Active scripts

- `backend/scripts/pull_asset_business_context.py`
- `backend/scripts/pull_asset_findings.py`
- `backend/scripts/export_assets_for_supabase.py`
- `backend/scripts/export_findings_for_supabase.py`
- `backend/scripts/reseed_assets_for_supabase.py`
- `backend/scripts/sync_epss.py`
- `backend/scripts/sync_kev.py`
- `backend/scripts/sync_nvd.py`
- `backend/scripts/sync_daily.py`
- `backend/scripts/score_findings_crq_v1.py`
- `backend/scripts/brinqa_source_helpers.py`

## Tests

- `backend/tests/test_findings_api.py`
- `backend/tests/test_topology_api.py`
- `backend/tests/test_crq_scoring.py`
- `backend/tests/test_asset_reseed_csv.py`
- `backend/tests/conftest.py`
