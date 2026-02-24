# VulnContext Desktop

VulnContext Desktop is a local-first vulnerability triage app with a FastAPI backend and a React/Electron frontend. It ingests Qualys-style CSV data, computes a context-aware risk score, and provides a findings workflow for filtering, drilling in, and marking manual dispositions (for example: ignored or false positive).

## What Changed Recently (High Level)

The recent updates are mostly additive and focused on triage workflow and UI polish:

- Added manual finding disposition support (`ignored`, `risk_accepted`, `false_positive`, `not_applicable`)
- Added disposition set/clear API endpoints and stored metadata (reason, comment, expiration, actor, timestamps)
- Added finding event logging table/model (`FindingEvent`) for audit-style tracking of disposition changes
- Added lifecycle/status-related fields on findings (groundwork for scan-over-time reconciliation)
- Added source filtering + source sorting in the findings table
- Expanded the finding drawer to include disposition controls and richer detail layout
- Added a separate `Findings` page and a basic dashboard chart (`RiskBandDistributionChart`)

Important: the code now contains lifecycle fields (e.g. `fixed`, `reopened`, `first_seen_at`) but the CSV upload path still appends rows and does not yet reconcile scan runs automatically.

## What "Taken Care Of" Means Right Now

Today, "taken care of" is implemented as a manual disposition on a finding, not automatic closed/fixed detection from comparing scans.

Implemented now:

- Manual disposition set/clear in the drawer
- Optional reason/comment/expiration
- Disposition metadata returned in finding API responses
- Disposition change events written to `finding_events`

Not fully implemented yet:

- Automatic scan-to-scan deduplication/reconciliation
- Automatic `new` / `fixed` / `reopened` transitions
- Scan run history logic using `scan_runs`

## Architecture (Surface Level)

- `backend/`: FastAPI API + SQLite + risk scoring + CSV ingestion
- `frontend/`: React + TypeScript + Vite renderer (also used by Electron shell)
- `frontend/electron-main.ts`: Electron main process entry
- `docker/`: backend container image

Data flow:

1. Upload Qualys-style CSV from the UI (`Integrations` page)
2. Backend parses rows, enriches EPSS, computes risk score/band, inserts into SQLite
3. Frontend fetches summary + paginated findings
4. User filters/sorts findings and edits manual dispositions in the drawer

## Architecture (Deeper)

### Backend

Key files:

- `backend/app/main.py`: app startup, CORS, router registration, EPSS download on startup
- `backend/app/api/scores.py`: main API (summary, pagination, band filtering, source management, disposition updates, CSV seeding)
- `backend/app/models.py`: SQLAlchemy models (`ScoredFinding`, `RiskScoringConfig`, `EpssScore`, `ScanRun`, `FindingEvent`)
- `backend/app/schemas.py`: response/request schemas including new disposition fields
- `backend/app/scoring.py`: scoring logic and risk band mapping
- `backend/app/seed.py`: CSV parsing/validation + row scoring
- `backend/app/epss.py`: downloads and stores EPSS daily data

### Frontend

Key files:

- `frontend/src/app.tsx`: top-level navigation (`Dashboard`, `Findings`, `Integrations`)
- `frontend/src/api.ts`: typed API client + new disposition/source filter requests
- `frontend/src/hooks/useScoresData.ts`: summary and paginated findings hooks
- `frontend/src/components/dashboard/RiskTable.tsx`: findings table with source + band filter + sorting
- `frontend/src/components/dashboard/VulnerabilityDrawer.tsx`: finding details + disposition actions
- `frontend/src/components/integrations/IntegrationsPage.tsx`: CSV import and source rename/delete management

## Data Model Notes (Current State)

### `scored_findings`

Primary record used by the UI. Includes:

- Asset/vuln metadata (CVE/CWE, host/IP, exposure, detection fields)
- Risk scoring output (`risk_score`, `risk_band`)
- New lifecycle fields (groundwork): `lifecycle_status`, `first_seen_at`, `last_seen_at`, `fixed_at`, etc.
- New manual triage fields: `disposition`, `disposition_reason`, `disposition_comment`, `disposition_expires_at`, etc.

### `finding_events`

Audit/event log table for finding changes. The recent work writes disposition changes here.

### `scan_runs`

Model exists to support future scan-over-time workflows, but the current seed endpoint does not populate or use it yet.

## API Overview

Base URL: `http://127.0.0.1:8000`

Core endpoints:

- `GET /health`
- `GET /scores/health`
- `GET /scores/summary`
- `GET /scores/top10`
- `GET /scores/all?page=1&page_size=50&sort_by=risk_score&sort_order=desc&source=Qualys`
- `GET /scores/band/{Critical|High|Medium|Low}?page=1&page_size=50&sort_by=source&sort_order=asc&source=Qualys`
- `GET /scores/sources`
- `PATCH /scores/sources/{source_name}` (rename source)
- `DELETE /scores/sources/{source_name}` (delete all findings for a source)
- `GET /scores/weights`
- `PUT /scores/weights`
- `POST /scores/findings/{finding_db_id}/disposition`
- `POST /scores/findings/{finding_db_id}/disposition/clear`
- `POST /scores/seed/qualys-csv` (multipart form: `source`, `file`)

Disposition values:

- `ignored`
- `risk_accepted`
- `false_positive`
- `not_applicable`
- `none` (cleared state, via clear endpoint)

## Risk Scoring Model

The risk score is a weighted blend of:

- CVSS
- EPSS
- Internet exposure
- Asset criticality
- Vulnerability age
- Authentication required (negative weight / penalty)

Output:

- `risk_score` in `0-100`
- `risk_band` in `Critical | High | Medium | Low`

Weights are editable in the UI and persisted in `risk_scoring_config`.

## Quick Start

### Prereqs

- Python 3.9+
- Node.js 18+
- npm

### Backend setup

```bash
cd backend
python3 -m pip install -r requirements.txt
```

Run API:

```bash
cd backend
python3 -m uvicorn app.main:app --reload --port 8000
```

Optional seed from local script:

```bash
cd backend
python3 -m app.seed
```

### Frontend setup (Vite + Electron project)

```bash
cd frontend
npm install
```

Run renderer + Electron:

```bash
cd frontend
npm run dev
```

Build:

```bash
cd frontend
npm run build
```

## Using the App

### Import findings

1. Open `Integrations`
2. Enter a source name (example: `Qualys-Prod`)
3. Upload a `.csv`
4. Import

### Triage a finding

1. Go to `Findings`
2. Filter by risk band or source
3. Open a row
4. In the drawer, set a disposition (ignored / risk accepted / false positive / not applicable)
5. Optionally add reason/comment/expiration

## How To Review What Changed (Git)

From the repo root:

```bash
git status --short
git diff --stat
git diff
```

Useful focused diffs for the recent updates:

```bash
git diff -- backend/app/models.py backend/app/schemas.py backend/app/api/scores.py
git diff -- frontend/src/api.ts frontend/src/components/dashboard/RiskTable.tsx frontend/src/components/dashboard/VulnerabilityDrawer.tsx
git diff -- frontend/package.json
```

If you want a file-by-file summary before reading code:

```bash
git diff --stat --compact-summary
```

## Verification Notes

What was checked locally during this review:

- `frontend`: `npm run build` passes
- `backend`: tests do not fully run in offline/sandboxed environments because app startup currently downloads EPSS data on startup

Why backend tests fail offline:

- `backend/app/main.py` triggers `get_epss_scores()` at startup
- `backend/app/epss.py` performs a live HTTP request to `epss.empiricalsecurity.com`
- In offline/test environments, startup fails before endpoint tests run

## Known Gaps / Caveats

- Lifecycle/over-time fields are present, but scan reconciliation is not implemented yet
- `scan_runs` model exists but is not used by the CSV upload endpoint yet
- `finding_events` currently captures disposition changes; broader event coverage is not implemented yet
- `frontend/package.json` now includes several UI/data-table dependencies that are not obviously used yet (worth pruning later)
- Docker sets `DB_PATH`, but backend DB config is currently hardcoded in `backend/app/core/db.py`

## Project Structure

```text
VulnContext-Desktop/
├── backend/
│   ├── app/
│   │   ├── api/scores.py
│   │   ├── core/db.py
│   │   ├── core/risk_weights.py
│   │   ├── epss.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── scoring.py
│   │   └── seed.py
│   └── tests/
├── frontend/
│   ├── electron-main.ts
│   ├── src/
│   │   ├── api.ts
│   │   ├── app.tsx
│   │   ├── components/
│   │   └── hooks/
│   └── package.json
├── docker/
├── docker-compose.yml
└── README.md
```
- Check `/health`
- Ensure port is free: `lsof -i :8000`

### Database issues
- SQLite DB is at `data/vulncontext.db`
- Reset by deleting the file and re-running seed:
```bash
rm data/vulncontext.db
python3 -m app.seed
```

### Frontend errors
- Ensure backend is running
- Check browser DevTools console
- Verify API base URL in `src/api.ts`

### Pagination / UI errors
- Ensure shadcn pagination is installed:
```bash
npx shadcn@latest add pagination
```

---

## Technologies

- **Backend**: FastAPI, SQLAlchemy, SQLite
- **Frontend**: React, TypeScript, shadcn/ui, Radix UI
- **State & Data**: Custom hooks
- **Infra**: Docker (optional)

---

## Future Enhancements

- CSV upload (Qualys-style integration)
- Editable scoring weights per organization
- Findings search & advanced filters
- Auth & multi-tenant support
- Charts & trend analysis
- Export & reporting
