# VulnContext Desktop

VulnContext Desktop is a local-first vulnerability triage application for importing scanner findings, adding business context, and helping teams decide what to work on first. It uses a FastAPI backend, a React frontend, SQLite for local storage, and an Electron shell for desktop usage during development.

The goal of the project is straightforward: take raw vulnerability data that is usually noisy and hard to prioritize, enrich it with better context, and present it in a workflow that makes triage faster and more consistent.

## Current Project Status

The project already supports the core end-to-end workflow:

- Import Qualys-style CSV findings into the local database
- Enrich findings with EPSS data and cached NVD details
- Calculate weighted risk scores and map them into risk bands
- Review findings in a searchable, filterable UI
- Open detailed finding views for deeper triage
- Apply manual dispositions such as `ignored`, `risk_accepted`, `false_positive`, and `not_applicable`
- Track source-level data and manage imported sources
- Adjust risk scoring weights from the UI

Today, the app is strongest as a desktop-friendly local triage tool for reviewing imported findings and making manual prioritization decisions.

## What Is Implemented

### Backend

- FastAPI API for findings, imports, sources, risk weights, and admin operations
- SQLite-backed persistence for findings, scoring configuration, enrichment data, and finding events
- CSV ingestion flow for staged finding imports
- Risk scoring pipeline that combines factors like CVSS, EPSS, exposure, age, and asset context
- Startup and on-demand enrichment support for EPSS and NVD-backed metadata

### Frontend

- React-based UI for findings review and source management
- Findings list with sorting, filtering, pagination, and detail navigation
- Dashboard summary views for risk distribution and top findings
- Finding detail page with manual disposition controls
- Source management page for importing, renaming, and deleting source data
- Editable risk weight configuration in the UI

## What We Plan To Improve

The next improvements are mainly about making the app smarter and more operationally useful:

### Data Integration

- Direct Brinqa integration through an in-app login flow and authenticated API requests
- Pulling findings and asset context from Brinqa instead of depending only on manual CSV uploads
- Broader import support beyond the current CSV-oriented workflow

### Storage And Scoring

- Moving toward a lighter local data model that stores scoring outputs, finding identifiers, and related references rather than fully duplicating source data locally
- Adding overall asset-level risk scoring alongside individual finding-level prioritization
- Better scan-to-scan reconciliation so repeated imports update existing findings instead of only appending rows
- Stronger lifecycle tracking for `new`, `fixed`, and `reopened` findings

### Enrichment And Freshness

- More enrichment sources and richer vulnerability context
- Scheduled daily jobs to refresh Brinqa data and keep EPSS, NVD, CVSS, and other enrichment inputs current

### Visibility And Reporting

- More informational graphs and dashboard views to reflect overall risk posture, vulnerability distribution, trends, and asset exposure at a glance
- Better history and audit visibility around triage decisions
- More polished reporting and trend views over time

### Product Experience

- Continued UI refinement for faster review at larger finding volumes

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm

### Backend

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8000
```

API docs:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

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

This starts the app with Docker Compose. By default, the frontend is served on `http://localhost:3000` and the backend on `http://localhost:8000`.

## Documentation

Detailed documentation for structure, APIs, frontend behavior, backend details, and testing lives in [docs/README.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/README.md).
