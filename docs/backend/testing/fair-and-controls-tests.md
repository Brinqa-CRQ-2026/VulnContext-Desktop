# FAIR, Controls, And Service Tests

These tests cover FAIR internals, loss prediction orchestration, controls/security-score helpers, and NVD sync parsing behavior.

## backend/tests/services/fair/test_fair_internals.py

### Files Tested

- `backend/app/services/fair/frequency/interface.py`
- `backend/app/services/fair/frequency/tef.py`
- `backend/app/services/fair/frequency/lef.py`
- `backend/app/services/fair/frequency/vulnerability.py`
- `backend/app/services/fair/magnitude/lm.py`
- `backend/app/services/fair/risk_engine.py`
- `backend/app/services/fair/controls/control_engine.py`
- `backend/app/services/fair/controls/control_inference.py`
- `backend/app/services/fair/controls/control_scoring.py`

### Cases Covered

- Clamps threat-event frequency probability of action.
- Increases action probability for KEV findings.
- Validates loss-event frequency probability inputs.
- Covers inferred controls and user-blended control paths.
- Checks vulnerability models for bounded, context-sensitive output.
- Verifies frequency engine orchestration of TEF, vulnerability, controls, and LEF results.
- Covers requested loss means and fallback loss paths.

### Edge Cases Covered

- Zero loss means are handled without invalid output.
- Invalid probability inputs are bounded or rejected as expected.
- Missing loss assumptions fall back to service value and context.

### Not Covered Here

- Large Monte Carlo statistical confidence.
- HTTP route mapping.
- Frontend FAIR visualization behavior.

## backend/tests/services/fair/test_loss_prediction.py

### Files Tested

- `backend/app/services/fair/loss_prediction.py`
- `backend/app/services/fair/frequency/interface.py`
- `backend/app/services/fair/magnitude/lm.py`
- `backend/app/services/fair/risk_engine.py`

### Cases Covered

- Builds loss-prediction context from asset and finding scores.
- Applies bounded fallbacks for incomplete scoring data.
- Handles empty, zero, and positive values in loss histograms.
- Orchestrates frequency, magnitude, and risk engines through the prediction service.

### Edge Cases Covered

- Empty histogram inputs return stable output.
- Zero loss values do not break histogram calculation.
- Missing scoring fields use bounded defaults.

### Not Covered Here

- HTTP route mapping for FAIR endpoints.
- Long-running/high-iteration simulations.
- Frontend FAIR panels.

## backend/tests/services/test_security_score.py

### Files Tested

- `backend/app/services/security_score.py`
- `backend/app/schemas.py`

### Cases Covered

- Normalizes nested and flat control answers.
- Bounds maturity/control values.
- Computes domain scores, confidence, and flat context values.
- Keeps helper output deterministic and bounded.

### Edge Cases Covered

- Out-of-range maturity values are clamped.
- Missing answer shapes still normalize to predictable output.

### Not Covered Here

- Supabase persistence.
- Controls HTTP routes.
- Security-score page rendering.

## backend/tests/services/test_sync_nvd.py

### Files Tested

- `backend/scripts/automation/sync_nvd.py`

### Cases Covered

- Extracts full finding enrichment from NVD records.
- Falls back from CVSS v4 to CVSS v2 when newer metrics are unavailable.
- Limits refresh payloads to record score fields during upload.

### Edge Cases Covered

- Missing preferred CVSS metrics use older available metrics.
- Upload refresh payload avoids updating unrelated fields.

### Not Covered Here

- Live NVD network calls.
- Production sync scheduling.
- Database upsert performance.

## backend/tests/api/test_fair_loss.py

### Files Tested

- `backend/app/api/findings.py`
- `backend/app/api/topology/fair_loss.py`
- `backend/app/services/fair/scope_loss_prediction.py`

### Cases Covered

- Maps finding FAIR loss requests and payloads to the prediction service.
- Returns `404` for unknown findings.
- Maps asset, application, and business-service route slugs/IDs to prediction services.
- Aggregates ranked asset findings for scope predictions.
- Uses normalized asset foreign keys when application scope has backfilled topology links.

### Edge Cases Covered

- Missing application scopes return empty predictions.
- Unknown finding IDs return not-found responses.

### Not Covered Here

- FAIR internal math; covered by service tests above.
- Long-running simulation latency.
- Frontend rendering.

## backend/tests/api/test_controls.py

### Files Tested

- `backend/app/api/controls.py`
- `backend/app/services/security_score.py`
- `backend/app/schemas.py`

### Cases Covered

- Normalizes answers through `POST /controls/security-score`.
- Returns default current assessment when Supabase has no rows.
- Inserts and updates current assessment rows.
- Delegates legacy save route to current-save behavior.
- Returns latest saved assessment or `null`.
- Maps Supabase failure modes to HTTP responses.

### Edge Cases Covered

- Missing Supabase environment returns `503`.
- Supabase read/write/latest failures return `502`.
- Missing Supabase rows are rejected during response coercion.

### Not Covered Here

- Live Supabase project behavior.
- Row-level security.
- Frontend controls UI.
