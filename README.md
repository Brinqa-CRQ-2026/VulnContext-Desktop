# VulnContext Desktop

VulnContext Desktop currently ships a Supabase-first FastAPI backend plus a React/Electron frontend for read-only vulnerability review, topology drill-down, and source-summary reporting.

The active runtime is narrower than some older docs and tests in the repo used to imply. Today the supported product surface is:

- findings summary, list, top-findings, and detail routes
- explicit finding narrative enrichment route for optional non-persisted Brinqa detail
- business-unit, business-service, application, asset, and asset-findings drill-down routes
- asset findings analytics route for full filtered-set summary cards/charts
- source summary reporting
- manual backend scripts for Brinqa export, enrichment sync, asset reseed, and CRQ scoring

## Quick Start

### Backend

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8000
```

API docs:

- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker

```bash
make up
```

## Current Developer Commands

- `make score-crq`
  Run the current CRQ scorer against persisted findings.
- `make score-crq-v4`
  Alias for the current scorer version.
- `make score-crq-preview`
  Print a dry-run preview of computed CRQ values.

## Data Workflow

The current project expects operational data to be managed through backend scripts rather than through frontend CSV upload or in-app source mutation flows.

The main scripts live under `backend/scripts/`:

- Brinqa export helpers: `pull_asset_business_context.py`, `pull_asset_findings.py`, `export_assets_for_supabase.py`, `export_findings_for_supabase.py`
- Supabase asset reseed: `reseed_assets_for_supabase.py`
- Enrichment sync: `sync_epss.py`, `sync_kev.py`, `sync_nvd.py`, `sync_daily.py`
- CRQ scoring: `score_findings_crq_v1.py`

## Documentation

Start with [docs/README.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/README.md).
