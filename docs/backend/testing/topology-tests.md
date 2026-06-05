# Topology API Tests

## Files

- `backend/tests/api/topology/test_business_units.py`
- `backend/tests/api/topology/test_business_services.py`
- `backend/tests/api/topology/test_applications.py`
- `backend/tests/api/topology/test_assets.py`
- shared seed helpers in `backend/tests/helpers/topology.py`

## Backend Coverage

- `backend/app/api/topology/`
- `backend/app/services/topology.py`
- `backend/app/services/topology_view.py`
- `backend/app/services/topology_shared.py`

## Cases Covered

- Normalized topology tables exist and enforce key uniqueness constraints.
- Seeded topology row counts match the first expected import pass.
- Asset topology foreign-key backfill matches exact business service and application names.
- Business-unit list/detail/risk-overview/findings routes return rollups, persisted CRQ scores, scoped findings, and missing-scope errors.
- Business-service detail/analytics routes return applications, direct assets, totals, risk labels, priority scores, and asset type distributions.
- Application detail routes return assets and finding counts under the selected business service.
- Asset list/detail/findings/analytics routes preserve legacy filters after normalized topology expansion.
- Asset findings UI inputs rely on persisted asset metadata and filtered finding analytics, not live enrichment.
- Asset routes still work without normalized topology when only legacy filters are used.
- Topology-only routes and `business_unit` asset filters return `503` when normalized topology is unavailable.
- Asset detail route remains DB-only.

## Not Covered Here

- Topology FAIR loss endpoints; see [fair-and-controls-tests.md](fair-and-controls-tests.md).
- Real Brinqa HTTP integration; live-fetch enrichment is legacy code outside active topology coverage.
- Postgres-specific query plans and performance characteristics; tests run on SQLite.
