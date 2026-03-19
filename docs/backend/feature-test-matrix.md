# Backend Feature And Test Matrix

## Current status

- Backend test suite currently passes: `35 passed` on March 18, 2026.
- FastAPI route explorer is available locally at `http://localhost:8000/docs`.
- ReDoc is available at `http://localhost:8000/redoc`.

## Backend features and what tests cover them

### 1. FastAPI app boot and API contract

Files:
- `backend/app/main.py`
- `backend/app/api/findings.py`
- `backend/app/api/sources.py`
- `backend/app/api/risk_weights.py`
- `backend/app/api/imports.py`
- `backend/app/api/admin.py`
- `backend/tests/test_api_contract.py`

Covered cases:
- App docs UI and OpenAPI schema are exposed.
- `/health` returns app health.
- `/findings/summary` returns zeroed counts when no findings exist.
- Summary uses display risk band, preferring internal risk over source risk.
- `/findings/top` sorts by display risk score.
- `/findings` returns paginated items and newer response fields.
- `/findings` filters on display band when `risk_band` is provided.
- `/findings/{id}` returns detailed finding fields.
- Finding detail includes NVD description when cache data exists.
- `/sources` groups counts by source and display risk band.
- `/risk-weights` returns default weights.
- Setting a finding disposition stores the result and records an audit event.

Edge cases covered:
- Empty database summary response.
- Internal score/band overriding source score/band for display.
- NVD cache description fallback path.

Not directly covered yet:
- `/risk-weights` update path.
- Invalid `sort_by`, invalid `sort_order`, invalid risk band, bad pagination/filter combinations.
- Source filtering in `/findings`.
- Source rename endpoint.
- Source delete endpoint.
- 404 path for missing finding IDs.
- Disposition clear endpoint.
- Disposition validation failures.
- KEV reload endpoint.

### 2. CSV ingestion and seed pipeline

Files:
- `backend/app/seed.py`
- `backend/app/api/imports.py`
- `backend/tests/test_seed_import.py`

Covered cases:
- Staged CSV parsing maps the newer schema fields into `ScoredFinding`.
- Lifecycle is normalized to `active` and `fixed`.
- Seed upload endpoint accepts the staged CSV shape.
- Seed upload automatically enriches findings from local EPSS cache.
- Seed upload automatically enriches findings from local NVD cache.
- EPSS enrichment updates in-memory findings.
- EPSS refresh updates already-persisted findings.

Edge cases covered:
- Fixed findings derive `fixed` lifecycle.
- Primary CVE mapping works from staged CSV fields.
- Internal risk score is recomputed after EPSS enrichment.
- Persisted findings without enrichment data are skipped safely.

Not directly covered yet:
- Empty CSV.
- Missing required columns.
- Invalid numeric, boolean, or datetime fields.
- Invalid encoding.
- Non-CSV upload.
- Oversized upload.
- Blank source name or source name length validation.
- Duplicate rows / idempotency behavior.

### 3. Internal scoring engine

Files:
- `backend/app/scoring.py`
- `backend/tests/test_scoring.py`
- `backend/tests/test_scoring_kev.py`

Covered cases:
- Maximum signal combination produces bounded critical output.
- Missing signals still produce a valid bounded score and band.
- Higher context increases score.
- Numeric asset criticality is supported.
- Dictionary scoring writes internal score and band fields.
- Manual override inputs replace computed internal score/band.
- KEV presence increases score and keeps result at least High.
- Higher EPSS increases score.

Edge cases covered:
- No-signal scoring path.
- Numeric asset criticality path.
- Manual override path.

Not directly covered yet:
- Boundary checks around exact band thresholds (`40`, `65`, `85`).
- Custom weight sets affecting score output.
- Context values greater than `1.0` being normalized from percentages.
- Asset criticality label normalization for unexpected labels.
- DataFrame scoring path.

### 4. NVD enrichment

Files:
- `backend/app/services/nvd_enrichment.py`
- `backend/tests/test_nvd_enrichment.py`

Covered cases:
- CVSS extraction prefers v3.1 over older metric blocks.
- Bootstrap and modified feed URLs are built correctly.
- NVD CVE parsing maps CVSS, CWE, and CISA KEV-style metadata.
- Gzipped feed ingestion stores NVD cache rows.
- NVD cache enrichment maps CVSS/CWE/KEV fields onto findings.
- Persisted findings can be refreshed from NVD cache.

Edge cases covered:
- Missing older/newer metric variants when v3.1 is present.
- Feed ingestion from compressed source data.
- KEV metadata transfer from cache into findings.

Not directly covered yet:
- Multiple-language descriptions or missing English description.
- Missing metrics blocks entirely.
- Deduping/updating an existing cached CVE row.
- Invalid or malformed NVD feed payloads.

### 5. KEV catalog enrichment

Files:
- `backend/app/services/kev_enrichment.py`
- `backend/tests/test_kev_enrichment.py`

Covered cases:
- KEV CSV loader parses CVE IDs and date fields.
- KEV lookup is case-insensitive.

Edge cases covered:
- Missing due date remains `None`.
- Case mismatch on CVE lookup.

Not directly covered yet:
- Full `/admin/enrichment/kev/reload` endpoint behavior.
- Marking and clearing KEV flags on stored findings.
- Invalid KEV CSV content and error handling.

## Bottom line

- The backend is tested in meaningful areas, but not everything is tested.
- The strongest coverage is around scoring, CSV import, and core read APIs.
- The largest gaps are mutation endpoints, validation/error paths, and some route-level edge cases.

## Recommended next tests

1. Add route tests for `/risk-weights` update, source rename/delete, disposition clear, and KEV reload.
2. Add negative tests for bad CSV uploads, bad sort/filter parameters, and missing finding IDs.
3. Add scoring boundary tests for exact band cutoffs and custom weight behavior.
