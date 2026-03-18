# Data Import Update Plan

This repo is currently built around a Qualys-style CSV import that inserts rows into the local SQLite database at `backend/vulncontext.db` via `POST /scores/seed/qualys-csv`.

Use this folder for the next dataset:

- `backend/data/import_staging/`

When the new file arrives, place it there first. Do not overwrite existing app code until the column inventory is reviewed.

## Current Constraints

- The DB model is centered on `scored_findings` in `backend/app/models.py`.
- The import parser in `backend/app/seed.py` currently requires a fixed minimum column set and ignores schema evolution work.
- The current upload endpoint appends rows. It does not reconcile scan runs or perform deduplication.
- The frontend types and detail views assume the current `ScoredFinding` shape in `frontend/src/api.ts`.

## Execution Order

1. Capture the raw file in `backend/data/import_staging/`.
2. Inventory every incoming column and map each one to one of:
   - existing DB field
   - new DB field
   - derived/scored field
   - unsupported/unused field
3. Decide the target import behavior:
   - append-only to `scored_findings`
   - replace a source
   - add scan reconciliation/history
4. Update the backend DB model first.
5. Update schema compatibility logic for local SQLite.
6. Update CSV parsing and validation.
7. Update scoring logic if any new columns affect risk or SLA behavior.
8. Update API schemas and endpoints.
9. Update frontend types, tables, filters, and detail drawer.
10. Add or update tests for import, API output, and UI assumptions.
11. Run verification against the staged file before using it in the app.

## Column Review Checklist

For each new column in the incoming file, answer:

- What is the exact source column name?
- Is it required, optional, nullable, or sometimes malformed?
- What is the data type?
- Should it be stored exactly, normalized, or derived?
- Does it affect risk scoring?
- Does it affect filtering, sorting, or display?
- Does it belong in `scored_findings`, a new table, or not in the DB at all?

## App Areas Likely To Change

### 1. Database Model

Primary file:

- `backend/app/models.py`

Likely work:

- add new SQLAlchemy columns to `ScoredFinding`
- decide whether any incoming data belongs in a separate table instead of widening `scored_findings`

### 2. Local DB Compatibility

Primary file:

- `backend/app/core/db.py`

Likely work:

- extend `ensure_database_schema()` so older local SQLite files gain any newly required columns
- add new indexes if the incoming fields will be filtered or queried often

### 3. Import Parsing

Primary file:

- `backend/app/seed.py`

Likely work:

- expand `REQUIRED_CSV_COLUMNS` only where truly necessary
- parse all newly supported columns
- normalize booleans, numbers, timestamps, and enums safely
- reject malformed rows with row-specific errors
- preserve extra useful fields instead of silently dropping them

### 4. Risk Scoring

Primary files:

- `backend/app/scoring.py`
- `backend/app/core/risk_weights.py`

Likely work:

- determine whether any new columns should affect `risk_score`, `risk_band`, or `sla_hours`
- keep backward compatibility for older imports that do not have the new fields

### 5. API Surface

Primary files:

- `backend/app/schemas.py`
- `backend/app/api/scores.py`

Likely work:

- expose newly stored fields in API responses
- update upload/seed behavior if import semantics change
- add filters or sorts for new high-value fields if needed

### 6. Frontend Consumption

Primary files:

- `frontend/src/api.ts`
- `frontend/src/hooks/useScoresData.ts`
- `frontend/src/components/dashboard/RiskTable.tsx`
- `frontend/src/components/dashboard/VulnerabilityDrawer.tsx`
- `frontend/src/components/integrations/IntegrationsPage.tsx`

Likely work:

- update TypeScript interfaces to match backend output
- decide which new fields belong in the table versus the detail drawer
- add any new source/import controls if the workflow changes

### 7. Tests

Primary files:

- `backend/tests/test_endpoints.py`
- `backend/tests/test_scoring.py`
- `backend/tests/test_scoring_kev.py`
- frontend tests if introduced later

Likely work:

- add a fixture CSV that matches the new dataset shape
- verify import success, validation failures, and output shape
- verify scoring changes if new columns influence the model

## Suggested Working Sequence When Data Arrives

1. Drop the raw file into `backend/data/import_staging/`.
2. I will inspect headers and produce a column mapping table.
3. We will confirm which columns must be persisted and which are only informational.
4. I will patch the backend model and compatibility migration.
5. I will patch the importer and tests.
6. I will patch API schemas/endpoints if response shape changes.
7. I will patch frontend typing and presentation.
8. I will run verification and report any gaps.

## Immediate Goal

When you provide the new file, the first implementation task is not import execution. It is schema mapping. That is the decision that controls every downstream change in the app.
