# Backend API Tests

These tests protect public FastAPI route behavior, response shaping, and route-to-service delegation for non-topology API modules.

## backend/tests/api/test_findings.py

### Files Tested

- `backend/app/api/findings.py`
- `backend/app/services/views/findings.py`
- finding response schemas in `backend/app/schemas.py`
- app health/docs/OpenAPI registration in `backend/app/main.py`

### Cases Covered

- Confirms `/health`, `/api/v1/health`, `/docs`, and `/openapi.json` are available.
- Verifies `/findings/summary` counts total findings, display risk bands, KEV totals, and average risk score.
- Verifies `/findings` returns paginated finding summaries and prefers CRQ display scores over source scores.
- Confirms versioned `/api/v1/findings` and `/api/v1/findings/summary` aliases work.
- Verifies `/findings/{finding_id}` returns persisted detail data only.
- Confirms NVD descriptions and KEV context are included when persisted CVE data exists.

### Edge Cases Covered

- Missing optional enrichment fields are not fabricated in detail responses.
- Persisted NVD/KEV context is returned without live Brinqa enrichment.

### Not Covered Here

- CRQ scoring math; see [scoring-tests.md](scoring-tests.md).
- Production database query plans.
- Authentication and authorization.

## backend/tests/api/test_sources.py

### Files Tested

- `backend/app/api/sources.py`
- `backend/app/services/views/sources.py`
- `SourceSummary` schema behavior

### Cases Covered

- Verifies `/sources` returns a read-only source summary derived from persisted findings.
- Confirms source totals are grouped and returned through the public API.

### Edge Cases Covered

- Keeps the source surface read-only; no mutation route behavior is implied.

### Not Covered Here

- Source create, rename, import, or delete flows.
- Frontend source card rendering.

## backend/tests/api/test_controls.py

### Files Tested

- `backend/app/api/controls.py`
- `backend/app/services/security_score.py`
- `backend/app/schemas.py`
- controls schemas in `backend/app/schemas.py`

### Cases Covered

- Normalizes answers through `POST /controls/security-score`.
- Returns the default current assessment when Supabase has no rows.
- Inserts and updates the current assessment through `PUT /controls/current`.
- Keeps legacy `POST /controls/save` delegated to the current-save path.
- Returns latest saved assessment or `null`.
- Rejects malformed Supabase rows during response coercion.

### Edge Cases Covered

- Returns `503` when Supabase environment variables are missing.
- Maps Supabase read, write, and latest-read failures to `502`.
- Handles both insert and update paths for the current assessment.

### Not Covered Here

- Live Supabase row-level security or network retries.
- Security-score page rendering.
- Browser local-storage fallback behavior.

## backend/tests/api/test_fair_loss.py

### Files Tested

- FAIR routes in `backend/app/api/findings.py` and `backend/app/api/topology/fair_loss.py`
- `backend/app/services/fair/loss_prediction.py`
- `backend/app/services/fair/scope_loss_prediction.py`
- `backend/app/services/topology/assets.py`
- `backend/app/services/topology/applications.py`
- `backend/app/services/topology/business_services.py`

### Cases Covered

- Maps finding FAIR loss requests and payloads to the prediction service.
- Returns `404` for unknown finding IDs.
- Maps asset, application, and business-service FAIR scope requests to scope services.
- Returns empty predictions for missing application scope.
- Aggregates ranked asset findings for scoped predictions.
- Uses normalized asset foreign keys for application scope after topology backfill.

### Edge Cases Covered

- Missing application scope returns an empty prediction instead of failing.
- Unknown finding IDs return not-found behavior.
- Backfilled normalized topology links are preferred when present.

### Not Covered Here

- Long-running/high-iteration simulation latency.
- Postgres-specific execution plans.
- Frontend FAIR panel rendering.
