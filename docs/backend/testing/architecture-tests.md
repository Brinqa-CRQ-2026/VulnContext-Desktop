# Architecture Tests

## Files

- `backend/tests/architecture/test_api_layering.py`

## Backend Coverage

- route-layer files under `backend/app/api/`

## Cases Covered

- Active API route modules are checked for obvious direct database-query leakage.
- The check guards against route files directly using `db.query(`, `joinedload(`, or `func.count(`.
- The topology API package is included in this check after the route split.

## Limitations

- This is a lightweight regression check, not a full static analyzer.
- It does not prove every route is thin; it only catches common violations.
- Controls routes currently use Supabase persistence directly and should be reviewed separately when controls tests are added.
