# Backend Coverage Gaps

These gaps are known and should be handled in a later test-addition pass.

## FAIR Loss Prediction

Untested endpoints:

- `POST /findings/{finding_id}/fair-loss`
- `POST /assets/{asset_id}/fair-loss`
- `POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/fair-loss`
- `POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}/fair-loss`

Needed cases:

- successful response shape with deterministic low-iteration request
- missing finding behavior
- empty asset/application/business-service scope behavior
- topology-missing `503` behavior for topology FAIR routes
- request validation for out-of-range `iterations` and loss means

## Controls And Security Score

Untested endpoints:

- `POST /controls/security-score`
- `PUT /controls/current`
- `GET /controls/current`
- `POST /controls/save`
- `GET /controls/saved/latest`

Needed cases:

- nested answers and flat fallback answers normalize correctly
- maturity values clamp to `0-5`
- confidence reflects answered controls
- missing Supabase environment returns `503`
- Supabase read/write failures return `502`
- insert/update/latest behavior is mocked without requiring real Supabase

## Environment Limits

- The suite uses SQLite, so it does not fully prove Postgres/Supabase behavior.
- External Brinqa calls are mocked.
- Coverage is not enforced yet.
