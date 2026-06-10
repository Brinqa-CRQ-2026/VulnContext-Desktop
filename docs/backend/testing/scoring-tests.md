# CRQ Scoring Tests

These tests cover backend CRQ scoring services and rollup helpers. They do not cover old scoring compatibility wrappers; those wrappers are outside the active runtime.

## backend/tests/services/scoring/test_crq_finding_scoring.py

### Files Tested

- `backend/app/services/scoring/crq_finding.py`
- `backend/app/models.py`

### Cases Covered

- Persists CRQ finding score values, risk bands, scoring version, and timestamps.
- Uses NVD CVSS, EPSS multipliers, KEV bonus, and source risk inputs in the expected order.
- Persists priority score using finding risk, asset context, and business criticality.
- Records missing-data notes when upstream scoring inputs are unavailable.

### Edge Cases Covered

- Missing asset context and business criticality default priority inputs to zero.
- Score and priority boundaries stay bounded.

### Not Covered Here

- API response shaping for finding scores.
- Production database query plans.

## backend/tests/services/scoring/test_crq_finding_scoring_edges.py

### Files Tested

- `backend/app/services/scoring/crq_finding.py`

### Cases Covered

- Reports missing database columns through the schema guard.
- Builds targeted finding `WHERE` clauses without broadening the update scope.

### Edge Cases Covered

- Targeted scoring keeps requested finding IDs scoped.
- Missing schema columns fail clearly before scoring runs.

### Not Covered Here

- Full scoring math, which is covered by `test_crq_finding_scoring.py`.
- Database migration execution.

## backend/tests/services/scoring/test_crq_rollup_scoring.py

### Files Tested

- `backend/app/services/scoring/crq_rollup.py`

### Cases Covered

- Returns zero for empty or unscored child inputs.
- Clamps child scores before rollup calculation.
- Rounds top-percent child selection to at least one item.
- Includes volume pressure in the precomputed-part formula.
- Prioritizes a few high-risk children over many low-risk children.

### Edge Cases Covered

- Empty inputs return zero.
- Null child scores are ignored.
- Top-percent selection never selects zero children when scored data exists.

### Not Covered Here

- Persistence of rollup results onto assets, applications, business services, or business units.
- Postgres-specific aggregate behavior.

## backend/tests/services/scoring/test_crq_asset_scoring.py

### Files Tested

- `backend/app/services/scoring/crq_asset.py`
- `backend/app/models.py`

### Cases Covered

- Aggregates finding risk for empty, low-risk, and high-risk finding sets.
- Uses weighted severity average, severity burden, and bounded high-score pressure.
- Derives environment, exposure, sensitivity, asset type, and tag-based context scores.
- Applies context as a bounded multiplier to final asset risk.
- Persists asset scores and supports targeted scoring.
- Assigns zero aggregated risk when an asset has no CRQ-scored findings.

### Edge Cases Covered

- Null context inputs and tag variants produce stable component scores.
- Same finding pressure changes final risk when asset context changes.
- Targeted scoring updates only requested assets.

### Not Covered Here

- Asset API response formatting.
- Live asset enrichment or Brinqa network fetches.

## backend/tests/services/scoring/test_crq_application_scoring.py

### Files Tested

- `backend/app/services/scoring/crq_application.py`
- `backend/app/models.py`

### Cases Covered

- Aggregates asset risk while ignoring null child scores.
- Uses weighted average, maximum child score, and finding-count burden.
- Derives PCI/PII compliance score from asset tags.
- Keeps final application risk bounded by aggregated asset risk.
- Persists scores, counts, and timestamps.
- Handles applications with no supporting assets and supports targeted scoring.

### Edge Cases Covered

- Empty application scopes score cleanly.
- Null asset scores are ignored.
- Targeted scoring updates only requested applications.

### Not Covered Here

- Application API route behavior.
- Business-service rollup behavior above the application level.

## backend/tests/services/scoring/test_crq_business_service_scoring.py

### Files Tested

- `backend/app/services/scoring/crq_business_service.py`
- `backend/app/models.py`

### Cases Covered

- Parses supported business-criticality labels and falls back cleanly on malformed labels.
- Computes priority score from business criticality and risk, or falls back to risk.
- Handles services with no applications and no direct assets.
- Rolls up application risk and direct-asset risk, ignoring null child scores.
- Combines application and direct-asset risk when both are present.
- Deduplicates asset and finding counts.
- Persists business-service scores and updates the affected business-unit rollup.

### Edge Cases Covered

- Malformed criticality persists null and priority falls back to risk.
- Only application risk, only direct asset risk, and zero application risk paths are covered.
- Null child scores are ignored.
- Business-unit rollup averages scored services and ignores nulls.

### Not Covered Here

- Business-service API response shaping.
- Production-only database constraints beyond the SQLite test database.
