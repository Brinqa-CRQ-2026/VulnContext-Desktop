# Architecture Tests

These tests protect high-level backend structure rules.

## backend/tests/architecture/test_api_layering.py

### Files Tested

- route-layer files under `backend/app/api/`
- topology route modules under `backend/app/api/topology/`

### Cases Covered

- Confirms active API route modules stay thin wrappers.
- Guards against direct route-layer database query leakage.
- Checks for direct `db.query(`, `joinedload(`, and `func.count(` usage in route files.
- Includes the split topology API package in the layering check.

### Edge Cases Covered

- Allows controls routes to use mocked Supabase persistence patterns covered by focused controls tests.

### Not Covered Here

- Full static analysis of every dependency.
- Proof that every route is perfectly thin.
- Service-layer architecture rules.
