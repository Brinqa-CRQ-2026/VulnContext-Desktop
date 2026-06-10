# VulnContext Desktop

VulnContext Desktop currently ships a Supabase-first FastAPI backend plus a React/Electron frontend for read-only vulnerability review and topology drill-down

## Quick Start

### Desktop Runtime

```bash
make desktop
```

This is the primary runtime. It starts the local backend, Vite renderer, and Electron app together.

Desktop runtime behavior:

- Electron opens directly to the dashboard
- `Shut Down` quits Electron and lets the launcher stop backend and renderer
- normal window close behaves the same as `Shut Down`

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

`make up` starts the backend plus a static web frontend served through nginx. It is not the Electron-owned desktop runtime.

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
- `make score-crq-applications`
  Run the current CRQ application scorer against persisted applications.
- `make score-crq-business-services`
  Run the current CRQ business-service scorer against persisted business services.

## Data Workflow

The current project expects operational data to be managed through backend scripts rather than through frontend CSV upload or in-app source mutation flows.

The main scripts live under `backend/scripts/`:

- Manual CRQ scoring: `manual/score_crq_findings_v1.py`, `manual/score_crq_assets_v2.py`, `manual/score_crq_applications_v2.py`, `manual/score_crq_business_services_v1.py`
- Manual benchmark: `manual/benchmark_topology_routes.py`
- GitHub Actions sync jobs: `automation/sync_epss.py`, `automation/sync_kev.py`, `automation/sync_nvd.py`, `automation/sync_daily.py`
- Legacy one-time Brinqa pull/export/reseed scripts: `backend/legacy/scripts/`

## Documentation

Start with [docs/README.md](docs/README.md) for the full documentation map.

Important project docs:

- [Sponsor Scoring Overview](docs/business/sponsor-scoring-overview.md)
  Sponsor and Brinqa-facing CRQ overview, adoption questions, and data/weight
  review guidance.
- [Technical Scoring Reference](docs/scoring/technical-scoring-reference.md)
  Canonical CRQ formulas, score scales, rollups, fields, limitations, future
  improvements, and worked examples.
- [Backend Docs](docs/backend/README.md)
  FastAPI/Supabase implementation, API references, scoring implementation,
  workflows, and tests.
- [Frontend Docs](docs/frontend/README.md)
  React/Electron renderer architecture, API contracts, state, runtime, UI, and
  tests.
- [Documentation Audit](docs/documentation-audit.md)
  Current documentation ownership, completed cleanup, and remaining docs gaps.

Scoring implementation references:

- [Backend Scoring Overview](docs/backend/scoring/README.md)
- [Finding Risk Scoring](docs/backend/scoring/finding-risk-scoring.md)
- [Asset Risk Scoring](docs/backend/scoring/asset-risk-scoring.md)
- [Application Risk Scoring](docs/backend/scoring/application-risk-scoring.md)
- [Business Service Scoring](docs/backend/scoring/business-service-scoring.md)

Runtime and API references:

- [Backend API Docs](docs/backend/api/README.md)
- [Topology And Assets API](docs/backend/api/topology-and-assets.md)
- [Frontend Runtime](docs/frontend/runtime/README.md)
- [Frontend API Contracts](docs/frontend/api/data-contracts.md)
