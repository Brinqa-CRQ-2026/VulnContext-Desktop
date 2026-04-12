# Backend Review Overview

This is the short version of where backend logic lives in VulnContext Desktop and how the main request flow works. Use this as a review guide if someone asks, "Where does that logic live?"

## High-Level Split

The backend is mostly split into six responsibility areas:

- `main.py`: app startup and router registration
- `api/`: HTTP endpoints
- `api/common.py`: shared API-layer helpers
- `core/`: database/session/config helpers
- top-level logic modules like `seed.py`, `scoring.py`, and `epss.py`: import, scoring, and enrichment logic
- `services/`: larger enrichment-specific logic like NVD and KEV handling

## Where Logic Lives

### App Startup

- `backend/app/main.py`
  This is the backend entry point.

It is responsible for:

- loading backend environment variables
- creating the database tables
- running lightweight schema compatibility setup
- creating the FastAPI app
- configuring CORS
- registering all routers from `api/__init__.py`
- refreshing EPSS data on startup when possible

If someone asks "Where does the backend start?" or "Where are routes registered?", this is the file.

### API Endpoints

`backend/app/api/findings.py`
  Finding-related routes live here.

This file handles:

- findings summary
- top findings
- paginated findings list
- single finding detail
- setting and clearing manual disposition values


`backend/app/api/imports.py`
  CSV upload/import endpoint lives here.

This file handles:

- validating uploaded CSV files
- reading the file contents
- calling parsing and enrichment helpers
- committing imported findings to the database


`backend/app/api/sources.py`
  Source management routes live here.

This file handles:

- source summary
- source rename
- source delete


`backend/app/api/risk_weights.py`
  Risk-weight configuration endpoints live here.

This file handles:

- reading the current scoring weights
- updating the stored scoring weights


`backend/app/api/admin.py`
  Small operational/admin routes live here.

Right now this is mainly for enrichment-related maintenance such as KEV reload behavior.

### Shared API Logic

- `backend/app/api/common.py`
  Shared endpoint-side logic lives here.

This file is important because it keeps routers thinner. It contains:

- normalization helpers for inputs like risk band and disposition
- shared sorting and filtering logic for findings queries
- display helpers that choose which score/band to show
- response mapping from SQLAlchemy models into API schema objects
- audit/event helpers like writing `FindingEvent` rows

If someone asks "Where do the endpoints convert DB rows into API responses?" or "Where does common findings filtering live?", this is the answer.

### Database And Configuration

- `backend/app/core/db.py`
  Database setup lives here.

This file handles:

- database URL resolution
- SQLAlchemy engine/session creation
- the shared `Base`
- session dependency for FastAPI routes
- lightweight schema compatibility updates for local SQLite databases

If someone asks "Where is the DB session created?" or "Where do schema compatibility changes happen?", this is the file.

- `backend/app/core/env.py`
  Backend environment loading lives here.

- `backend/app/core/risk_weights.py`
  Default weights and scoring-config helpers live here.

This file handles:

- the default risk-weight values
- converting config rows into weight dictionaries
- creating the initial scoring config row if it does not exist yet

### Data Models And API Schemas

- `backend/app/models.py`
  Database models live here.

Key models include:

- `ScoredFinding`: the main stored finding record used by the app
- `RiskScoringConfig`: persisted scoring weights
- `EpssScore`: cached EPSS enrichment data
- `NvdCveCache`: cached NVD/CVE enrichment data
- `ScanRun`: groundwork for scan history and reconciliation
- `FindingEvent`: audit/event history for finding changes

- `backend/app/schemas.py`
  FastAPI request and response schemas live here.

This file defines:

- response shapes for findings and summaries
- request/response models for source actions
- request/response models for risk weights
- disposition update payloads
- admin request/response payloads

If someone asks "Where is the API contract defined?", this is the file.

### Risk Scoring Logic

- `backend/app/scoring.py`
  Internal scoring logic lives here.

This file handles:

- computing the internal risk score
- mapping a numeric score to a risk band
- combining weighted signals such as CVSS, EPSS, KEV, asset criticality, and context score
- applying overrides when needed
- scoring individual finding dictionaries or dataframes

If someone asks "Where is the custom risk score calculated?", this is the main answer.

### CSV Import And Finding Construction

- `backend/app/seed.py`
  CSV parsing and imported finding construction live here.

This file handles:

- validating required CSV columns
- parsing strings into ints, floats, booleans, and datetimes
- deriving values like primary CVE and lifecycle status
- building `ScoredFinding` objects from CSV rows
- enriching imported findings with EPSS data
- refreshing stored findings with EPSS data

This is one of the most important workflow files because it turns raw imported rows into app-ready finding records.

### Enrichment Logic

- `backend/app/epss.py`
  EPSS download and refresh logic lives here.

This file handles:

- downloading the current EPSS dataset
- clearing and repopulating the local EPSS cache table

- `backend/app/services/nvd_enrichment.py`
  NVD/CVE enrichment logic lives here.

This file handles:

- downloading NVD feeds
- parsing CVE JSON feed entries
- extracting descriptions, CWEs, CVSS, and KEV-related fields
- upserting NVD cache rows
- enriching findings from cached NVD data
- recalculating internal scores after enrichment

- `backend/app/services/kev_enrichment.py`
  KEV CSV parsing helpers live here.

This file handles:

- loading a KEV catalog from CSV
- normalizing KEV records by CVE
- looking up a KEV record for a given CVE

## Main Workflow To Remember

### 1. App Startup

The app starts in `backend/app/main.py`.

At startup it:

- loads environment configuration
- ensures tables exist
- runs lightweight schema compatibility changes
- registers all routers
- tries to refresh EPSS data

### 2. Importing Findings

The import request enters through `backend/app/api/imports.py`.

From there the flow is roughly:

1. validate the uploaded file and source name
2. read the CSV text
3. get or create the current scoring config from `core/risk_weights.py`
4. parse rows into `ScoredFinding` objects using `seed.py`
5. enrich those findings with EPSS data
6. enrich those findings with NVD cache data
7. recompute internal risk score/band as enrichment is applied
8. save the final rows into SQLite

### 3. Viewing Findings

The findings list/detail flow lives mainly in `backend/app/api/findings.py`.

That route layer:

- builds SQLAlchemy queries
- applies source/risk-band filters
- applies sorting rules
- fetches DB rows
- uses `api/common.py` to convert DB models into API response objects

### 4. Updating Dispositions

Manual triage updates also go through `backend/app/api/findings.py`.

That flow:

1. loads the target `ScoredFinding`
2. validates the disposition value with helpers from `api/common.py`
3. updates disposition fields on the finding
4. writes a `FindingEvent` audit record through `record_finding_event`
5. commits the change

## Simple Mental Model

If you need a very short explanation during review, this is a good one:

- `main.py` starts the app
- `api/` exposes endpoints
- `api/common.py` holds shared API logic and response mapping
- `models.py` defines the database tables
- `schemas.py` defines the API request/response shapes
- `seed.py` parses imported data into findings
- `scoring.py` computes the internal score
- `epss.py` and `services/` handle enrichment data
- `core/` handles DB sessions, env loading, and scoring config defaults

## Likely Review Questions

### Where is custom risk scoring implemented?

- `backend/app/scoring.py`

### Where is CSV parsing/import logic implemented?

- `backend/app/seed.py`
- route entry point: `backend/app/api/imports.py`

### Where are findings endpoints implemented?

- `backend/app/api/findings.py`

### Where are DB models defined?

- `backend/app/models.py`

### Where are API request/response schemas defined?

- `backend/app/schemas.py`

### Where do enrichment and external vulnerability-data updates happen?

- EPSS: `backend/app/epss.py`
- NVD: `backend/app/services/nvd_enrichment.py`
- KEV helpers: `backend/app/services/kev_enrichment.py`

### Where does shared endpoint logic live?

- `backend/app/api/common.py`
