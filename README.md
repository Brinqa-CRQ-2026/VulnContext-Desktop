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

### Desktop Runtime

```bash
make desktop
```

This is the primary runtime. It starts the local backend, Vite renderer, and Electron app together.

Desktop runtime behavior:

- Electron owns the Brinqa login/logout/reset lifecycle
- `Log Out` returns the running desktop app to the Brinqa login window
- `Skip Brinqa` / `UI Only` bypasses Brinqa login and enrichment calls
- `Shut Down` quits Electron and lets the launcher stop backend and renderer
- normal window close behaves the same as `Shut Down`
- next startup prompts for a fresh Brinqa login after shutdown cleanup

If Electron does not open, rerun from the repo root and review the launcher output. The desktop launcher now prefers `8000` and `5173`, but automatically moves to the next free localhost ports when either one is already in use.

### Backend Only

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8000
```

API docs:

- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

### Frontend Only

```bash
cd frontend
npm install
npm run dev
```

### Docker

```bash
make up
```

`make up` starts the backend plus a static web frontend served through nginx. It is not the Electron-owned desktop runtime and does not manage the Brinqa login window lifecycle.

## Current Developer Commands

- `make desktop`
  Start the primary local desktop runtime.
- `make score-crq`
  Compatibility alias for the findings scorer.
- `make score-crq-findings`
  Run the current CRQ findings scorer against persisted findings.
- `make score-crq-v4`
  Alias for the current scorer version.
- `make score-crq-preview`
  Print a dry-run preview of computed CRQ values.
- `make score-assets`
  Compatibility alias for the asset scorer.
- `make score-crq-assets`
  Run the current CRQ asset scorer against persisted assets.

## Data Workflow

The current project expects operational data to be managed through backend scripts rather than through frontend CSV upload or in-app source mutation flows.

The main scripts live under `backend/scripts/`:

- Manual operator scripts: `manual/pull_asset_business_context.py`, `manual/pull_asset_findings.py`, `manual/export_assets_for_supabase.py`, `manual/export_findings_for_supabase.py`, `manual/reseed_assets_for_supabase.py`
- Manual CRQ scoring: `manual/score_crq_findings_v1.py`, `manual/score_crq_assets_v1.py`
- GitHub Actions sync jobs: `automation/sync_epss.py`, `automation/sync_kev.py`, `automation/sync_nvd.py`, `automation/sync_daily.py`

## Documentation

Start with [docs/README.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/README.md).
