# Topology API Tests

These tests protect normalized topology browsing, asset browsing, topology fallback behavior, and topology-specific analytics routes.

## backend/tests/api/topology/test_business_units.py

### Files Tested

- `backend/app/api/topology/business_units.py`
- `backend/app/services/topology/business_units.py`
- `backend/app/services/topology/maintenance.py`
- `backend/tests/helpers/topology.py`

### Cases Covered

- Confirms normalized topology tables and uniqueness constraints exist.
- Verifies seed row counts match the first import pass.
- Verifies asset topology backfill matches exact business service/application names.
- Confirms business-unit list/detail routes return seeded topology, child services, metrics, and rollups.
- Confirms risk overview and scoped findings routes aggregate data within the business-unit scope.
- Confirms persisted rollup scores are exposed by business-unit routes.

### Edge Cases Covered

- Missing application matches remain null during backfill.
- Topology risk routes return `503` when normalized topology tables are unavailable.
- Scoped findings preserve expected filters and aggregation behavior.

### Not Covered Here

- Business-service detail routes below the business-unit layer.
- FAIR loss endpoints for topology scopes.
- Postgres query plans.

## backend/tests/api/topology/test_business_services.py

### Files Tested

- `backend/app/api/topology/business_services.py`
- `backend/app/services/topology/business_services.py`
- `backend/app/schemas.py`

### Cases Covered

- Verifies business-service analytics return totals.
- Verifies risk labels, priority scores, and business criticality context are included.
- Verifies asset type distributions are returned and limited to the top five buckets.

### Edge Cases Covered

- Analytics use the selected business-unit/business-service scope.
- Asset distribution output remains bounded for chart consumers.

### Not Covered Here

- Application detail route behavior.
- Business-service FAIR loss route behavior.
- Frontend chart rendering.

## backend/tests/api/topology/test_applications.py

### Files Tested

- `backend/app/api/topology/applications.py`
- `backend/app/api/topology/business_services.py`
- `backend/app/services/topology/applications.py`
- `backend/app/services/topology/business_services.py`

### Cases Covered

- Verifies business-service detail returns applications and direct assets.
- Verifies application detail returns child assets and finding counts under the selected service.

### Edge Cases Covered

- Direct assets remain attached to the business service without being assigned to an application.
- Application asset lists stay scoped to the selected business service.

### Not Covered Here

- Asset findings drill-down.
- Application FAIR loss prediction.
- Frontend application page rendering.

## backend/tests/api/topology/test_assets.py

### Files Tested

- `backend/app/api/topology/assets.py`
- `backend/app/services/topology/assets.py`
- `backend/app/schemas.py`

### Cases Covered

- Verifies asset list/detail/findings routes preserve legacy filters after normalized topology expansion.
- Verifies asset findings analytics summarize the full filtered result set.
- Verifies assets analytics summarize the full filtered asset set.
- Confirms topology-only routes and `business_unit` asset filters return `503` without normalized topology.
- Confirms asset routes still work without normalized topology when only legacy filters are used.

### Edge Cases Covered

- Asset detail remains DB-only and does not call live enrichment.
- Asset findings analytics ignore pagination and aggregate the filtered set.
- Legacy text filters continue working when normalized tables are absent.

### Not Covered Here

- Frontend asset table rendering.
- Real Brinqa HTTP integration.
- Postgres-specific query plans and performance characteristics.
