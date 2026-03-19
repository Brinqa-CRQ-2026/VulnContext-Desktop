# Backend API Endpoints

Base URL: `http://127.0.0.1:8000`

This document describes each active backend endpoint, what it is used for, its inputs and outputs, and where its data comes from.

## Health

### `GET /health`

Use:
- Confirms the FastAPI app is up.

Inputs:
- None.

Output:
- JSON:
```json
{ "status": "ok" }
```

Data source:
- No database read.
- Static in-process response from the app.

## Findings

### `GET /findings/summary`

Use:
- Dashboard summary totals.
- Risk band counts across all stored findings.
- KEV subtotal counts.

Inputs:
- None.

Output:
- JSON object with:
  - `total_findings`
  - `risk_bands`
  - `kevFindingsTotal`
  - `kevRiskBands`

Data source:
- Reads from local SQLite `scored_findings`.
- Uses display risk band priority:
  - `internal_risk_band`
  - `risk_band`
  - `risk_rating`

### `GET /findings/top`

Use:
- Top findings table.
- Highest-risk findings ranked by display risk score.

Inputs:
- None.

Output:
- JSON array of up to 10 `ScoredFindingOut` records.

Data source:
- Reads from local SQLite `scored_findings`.
- Orders by:
  - `internal_risk_score`
  - fallback to `risk_score`

### `GET /findings`

Use:
- Main findings table.
- Paginated findings browsing.
- Filtering by source or display risk band.

Inputs:
- Query params:
  - `page`
  - `page_size`
  - `sort_by`
  - `sort_order`
  - `source`
  - `risk_band`

Output:
- JSON object:
  - `items`
  - `total`
  - `page`
  - `page_size`

Data source:
- Reads from local SQLite `scored_findings`.
- Uses display risk score for default sorting.
- Uses display risk band for `risk_band` filtering.

### `GET /findings/{finding_db_id}`

Use:
- Finding detail page.
- Fetch one full finding record by local DB primary key.

Inputs:
- Path param:
  - `finding_db_id`

Output:
- One `ScoredFindingOut` JSON object.

Data source:
- Reads the finding from local SQLite `scored_findings`.
- Also looks up CVE description from local SQLite `nvd_cve_cache` when `cve_id` exists.

### `POST /findings/{finding_db_id}/disposition`

Use:
- Mark a finding as manually triaged.

Inputs:
- Path param:
  - `finding_db_id`
- JSON body:
  - `disposition`
  - `reason`
  - `comment`
  - `expires_at`
  - `actor`

Output:
- `FindingDispositionResult` JSON object showing the stored disposition state.

Data source:
- Updates local SQLite `scored_findings`.
- Writes an audit event to local SQLite `finding_events`.

### `POST /findings/{finding_db_id}/disposition/clear`

Use:
- Reset a finding disposition back to `none`.

Inputs:
- Path param:
  - `finding_db_id`
- Optional query param:
  - `actor`

Output:
- `FindingDispositionResult` JSON object with cleared disposition fields.

Data source:
- Updates local SQLite `scored_findings`.
- Writes an audit event to local SQLite `finding_events`.

## Sources

### `GET /sources`

Use:
- Source inventory page.
- Per-source counts and risk distribution.

Inputs:
- None.

Output:
- JSON array of source summary objects:
  - `source`
  - `total_findings`
  - `risk_bands`

Data source:
- Reads from local SQLite `scored_findings`.

### `PATCH /sources/{source_name}`

Use:
- Rename a logical source label across all matching findings.

Inputs:
- Path param:
  - `source_name`
- JSON body:
```json
{ "new_source": "New Name" }
```

Output:
- JSON object:
  - `old_source`
  - `new_source`
  - `updated_rows`

Data source:
- Updates local SQLite `scored_findings`.

### `DELETE /sources/{source_name}`

Use:
- Delete all findings belonging to one source.

Inputs:
- Path param:
  - `source_name`

Output:
- JSON object:
  - `source`
  - `deleted_rows`
  - `total_findings_remaining`

Data source:
- Deletes from local SQLite `scored_findings`.

## Risk Weights

### `GET /risk-weights`

Use:
- Load current internal scoring weights for the UI editor.

Inputs:
- None.

Output:
- JSON object:
  - `cvss_weight`
  - `epss_weight`
  - `kev_weight`
  - `asset_criticality_weight`
  - `context_weight`

Data source:
- Reads from local SQLite `risk_scoring_config`.
- Creates a default config row if one does not exist yet.

### `PUT /risk-weights`

Use:
- Update internal scoring weights and rescore all persisted findings.

Inputs:
- JSON body:
  - `cvss_weight`
  - `epss_weight`
  - `kev_weight`
  - `asset_criticality_weight`
  - `context_weight`

Output:
- JSON object:
  - `updated_rows`
  - `weights`

Data source:
- Updates local SQLite `risk_scoring_config`.
- Recomputes and updates matching fields in local SQLite `scored_findings`.

## Imports

### `POST /imports/findings/csv`

Use:
- Import staged findings CSV data from the UI.

Inputs:
- Multipart form fields:
  - `source`
  - `file`

Output:
- JSON object:
  - `inserted`
  - `source`
  - `total_findings`

Data source:
- Parses uploaded CSV in memory.
- Reads local SQLite `epss_scores` to enrich EPSS when available.
- Reads local SQLite `nvd_cve_cache` to enrich CVSS/CWE/KEV fields when available.
- Inserts resulting rows into local SQLite `scored_findings`.
- Tries a fresh EPSS download first, but safely falls back to local cache if that refresh fails.

## Admin

### `POST /admin/enrichment/kev/reload`

Use:
- Re-run KEV enrichment across all stored findings using a provided KEV CSV file.

Inputs:
- JSON body:
```json
{ "csv_path": "/absolute/or/relative/path/to/kev.csv" }
```

Output:
- JSON object:
  - `csv_path`
  - `updated_rows`
  - `kev_rows_marked`
  - `kev_rows_cleared`

Data source:
- Reads a KEV CSV from the local filesystem path provided in the request.
- Reads and updates local SQLite `scored_findings`.
- Uses local SQLite `risk_scoring_config` to rescore changed findings.
