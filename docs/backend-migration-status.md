# Backend Migration Status

This is the living status document for the schema replacement and backend rewrite. Update this file every time a meaningful backend/data-contract change is made.

## Goal

Replace the old Qualys-style backend data model with the new Brinqa/Wiz-style finding dataset while preserving room for app-owned internal risk scoring and remediation workflow.

## Current Backend State

The backend is in a transition phase.

What is true right now:

- the local SQLite database schema has been widened and repointed around the new staged dataset
- the CSV importer has been rewritten to seed the new dataset shape
- minimal internal scoring fields are being reintroduced on findings so CVE-based enrichment can work again
- the backend API routes and response schemas now serialize the staged finding model instead of the old asset/finding contract
- the frontend still mostly assumes the old response shape

This means:

- database and import are working for the new data
- internal scoring can be rebuilt on top of the new data model without reusing stale exposure/auth fields
- the backend contract is now ahead of the frontend contract

## What Has Been Done

### 1. Staging Area Created

Path:

- `backend/data/import_staging/`

Purpose:

- hold incoming raw datasets before code changes are made

### 2. New Dataset Inspected

File inspected:

- `backend/data/import_staging/finding_clean_sample.csv`

Observed:

- 55 columns
- 2000 rows in the sample file
- data model is Brinqa/Wiz-style finding metadata, not the old Qualys scoring row model

Important source columns include:

- `uid`
- `display_name`
- `status`
- `status_category`
- `source_status`
- `compliance_status`
- `severity`
- `age_in_days`
- `first_found`
- `last_found`
- `due_date`
- `target_ids`
- `target_names`
- `base_risk_score`
- `risk_score`
- `risk_rating`
- `record_link`
- `sla_days`
- `sla_level`
- `risk_owner_name`
- `remediation_owner_name`
- connector and integration provenance fields

### 3. Database Schema Updated

Primary files changed:

- `backend/app/models.py`
- `backend/app/core/db.py`

What changed:

- `ScoredFinding` was reshaped around the new canonical imported fields
- the local SQLite compatibility migration now adds the new columns
- the local DB was migrated in place

New imported/vendor-side field groups now stored on each finding:

- identity and record metadata
- status and lifecycle source fields
- risk and SLA fields from the source system
- target and attack metadata
- connector and integration metadata
- provenance and model metadata

### 4. App-Owned Fields Added

These are distinct from imported/vendor fields and are intended to be managed by this app:

- `internal_risk_score`
- `internal_risk_band`
- `internal_risk_notes`
- `remediation_summary`
- `remediation_plan`
- `remediation_notes`
- `remediation_status`
- `remediation_due_date`
- `remediation_updated_at`
- `remediation_updated_by`

Purpose:

- store your own risk and remediation workflow per finding
- keep internal decisions separate from imported source-system values

### 5. Importer Rewritten

Primary file changed:

- `backend/app/seed.py`

What changed:

- the old Qualys-specific parser was removed
- the importer now reads the new staged CSV shape directly
- required columns now match the new dataset
- vendor fields are stored directly in the DB
- compatibility fields are derived during import:
  - `risk_band` from `risk_rating`
  - `lifecycle_status` from `status_category` and `source_status`
  - `finding_key` from `source:uid`

### 6. Focused Import Tests Added

Primary file:

- `backend/tests/test_seed_import.py`

Verified:

- parser maps the new schema correctly
- fixed/open lifecycle compatibility fields derive correctly
- seed endpoint accepts the new CSV shape

### 7. Sample Data Seeded Into Local DB

Seed result:

- source label: `Brinqa-Wiz Sample`
- inserted rows: `2000`
- plus local NVD/validation test rows: `4`

Current imported distribution:

- `Critical`: `42`
- `High`: `148`
- `Medium`: `967`
- `Low`: `843`

Current lifecycle distribution:

- `active`: `1571`
- `fixed`: `429`

Important note:

- these `Critical`/`High`/`Medium`/`Low` values currently come from imported vendor `risk_rating`
- they are not yet driven by the app-owned `internal_risk_score` / `internal_risk_band`

### 8. Scoring Realignment Started

Primary files changed:

- `backend/app/models.py`
- `backend/app/core/db.py`
- `backend/app/scoring.py`
- `backend/app/core/risk_weights.py`
- `backend/app/seed.py`

What changed:

- the finding model now has explicit storage for `cve_id`, CVSS, EPSS, KEV, asset criticality, and context score
- importer logic now derives a primary `cve_id` from the staged `cve_ids` field
- importer logic now enriches findings with local EPSS data during CSV seed/import
- importer logic now enriches findings with NVD CVE data during CSV seed/import when `cve_id` is available
- internal scoring has been simplified to use only:
  - CVSS
  - EPSS
  - KEV presence
  - asset criticality
  - analyst context
- old scoring factors like `internet_exposed` and `auth_required` are no longer part of the internal scoring formula

Important note:

- the staged CSV still does not provide CVSS or EPSS values directly
- EPSS refresh support still exists in `backend/app/epss.py`
- once `epss_scores` is populated, import now auto-fills `epss_score` and `epss_percentile` from derived `cve_id`
- NVD import enrichment now fills CVSS and CWE fields from the official NVD CVE API using `NVD_API_KEY`
- NVD import enrichment now reads from a local `nvd_cve_cache` table populated from official bulk feeds
- KEV is still the next separate enrichment pass, though NVD cache already provides CISA exploit-add fields

### 9. Local NVD Cache Added

Primary files changed:

- `backend/app/models.py`
- `backend/app/services/nvd_enrichment.py`
- `backend/scripts/sync_nvd_cache.py`

What changed:

- added a local `nvd_cve_cache` table keyed by `cve_id`
- added a bulk feed sync flow that downloads official NVD JSON 2.0 feed files and stores parsed CVE metadata locally
- import-time NVD enrichment now joins findings against the local cache instead of making live per-CVE API calls

Operational note:

- run `python3 scripts/sync_nvd_cache.py bootstrap` from `backend/` for the first full load
- run `python3 scripts/sync_nvd_cache.py modified` from `backend/` for later updates
- run `python3 scripts/refresh_finding_enrichment.py` to backfill existing `scored_findings` rows from local EPSS and NVD caches
- once the cache is populated, imports stay local for NVD enrichment
- this refresh flow is the intended base for a later scheduled job or UI-triggered refresh button

## Current Local DB Snapshot

Observed in the current local SQLite database:

- `scored_findings`: `2004`
- `epss_scores`: `319355`
- `nvd_cve_cache`: `336795`
- `risk_scoring_config`: `1`
- `finding_events`: `0`
- `scan_runs`: `0`

Current enrichment coverage on `scored_findings`:

- findings with derived `cve_id`: `1855`
- findings with `epss_score`: `1853`
- findings with `cvss_score`: `1853`
- findings with `is_kev = true`: `15`
- findings with `internal_risk_score`: `1854`

Interpretation:

- EPSS is now enriching most findings that have a resolvable CVE
- the local NVD cache is populated and working
- existing findings have now been backfilled from local EPSS and NVD caches
- one finding still has internal risk without CVSS because it was manually tested outside the normal cache-backed path

## What Is Still Not Done

### Frontend Contract Gaps

The frontend still largely assumes the old finding shape and old drawer/table content.

Primary files that will need updates later:

- `frontend/src/api.ts`
- `frontend/src/hooks/useScoresData.ts`
- `frontend/src/components/dashboard/RiskTable.tsx`
- `frontend/src/components/dashboard/VulnerabilityDrawer.tsx`
- `frontend/src/components/integrations/IntegrationsPage.tsx`

## Next Backend Steps

This is the recommended backend order from here.

### Step 1. Populate Scoring Inputs

Primary areas:

- EPSS backfill from `epss_scores`
- KEV backfill from a KEV CSV
- future CVSS/NVD enrichment path

Goal:

- ensure findings automatically receive `epss_score` during import from the local EPSS cache keyed by derived `cve_id`

### Step 2. Rewrite Backend Schemas

Primary file:

- `backend/app/schemas.py`

Goal:

- completed: old API response/request models were replaced with ones that match the new finding contract
- completed: app-owned internal risk and remediation fields are now exposed separately from imported vendor risk

### Step 3. Rewrite Core Score Routes

Primary file:

- `backend/app/api/scores.py`

Goal:

- completed: routes now return the new finding shape
- completed: display `risk_score` / `risk_band` now prefer app-owned internal risk and fall back to imported vendor risk
- completed: imported vendor risk remains exposed separately as `source_risk_score`, `source_risk_band`, and `source_risk_rating`

### Agreed Enrichment Order

From here, the agreed scoring-enrichment sequence is:

1. EPSS
2. KEV
3. CVSS via API/feed integration

First route group stabilized:

- `GET /scores/top10`
- `GET /scores/summary`
- `GET /scores/all`
- `GET /scores/band/{risk_band}`
- `GET /scores/findings/{finding_db_id}`
- `GET /scores/sources`

### Step 4. Add App-Owned Update Endpoints

New backend work needed:

- endpoint to update internal risk fields
- endpoint to update remediation fields

Goal:

- allow the frontend drawer to save your own risk score and remediation workflow per finding

### Step 5. Reassess Old Scoring Endpoints

Primary areas:

- risk weights config
- old computed scoring logic

Current backend decision:

- API `risk_score` and `risk_band` now mean the app display risk
- display risk uses `internal_risk_score` / `internal_risk_band` when present
- otherwise it falls back to imported vendor `risk_score` / `risk_band`

### Step 6. Clean Up Legacy Backend Paths

After the new route contract is stable:

- remove dead old-field assumptions
- reduce legacy compatibility shims
- update outdated tests

## Immediate Recommendation

The next backend task should be:

- rewrite `backend/app/schemas.py`
- then rewrite `backend/app/api/scores.py`
- then add update endpoints for internal risk and remediation

That is the minimum backend work required before the frontend can be updated cleanly against the new data model.

## Verification History

Completed verification so far:

- `python3 -m compileall backend/app/models.py backend/app/core/db.py`
- `PYTHONPATH=. pytest tests/test_seed_import.py -q`
- direct local seed of `finding_clean_sample.csv` into `backend/vulncontext.db`

## Update Rule

Whenever backend schema, importer, API contract, or seed behavior changes, append or revise this file before moving on.
