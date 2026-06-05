# Backend Architecture

## Summary

The backend is a FastAPI service over Supabase-backed Postgres tables. The
runtime shape is intentionally layered:

```text
API route -> Service -> Repository -> SQLAlchemy model / Pydantic schema
```

API modules define HTTP behavior, services own workflows and response shaping,
repositories own reusable database query construction, SQLAlchemy models define
database tables, and Pydantic schemas define API contracts.

## Runtime Layers

| Layer | Path | Responsibility |
| --- | --- | --- |
| API | `backend/app/api/` | HTTP routes, query/path/body inputs, dependency wiring, response models |
| Services | `backend/app/services/` | business workflows, scoring workflows, read-model assembly, error decisions |
| Repositories | `backend/app/repositories/` | SQLAlchemy query construction and database fetch helpers |
| Models | `backend/app/models.py` | SQLAlchemy ORM definitions for Supabase Postgres tables |
| Schemas | `backend/app/schemas.py` | Pydantic request and response contracts |
| Core | `backend/app/core/` | database engine/session setup and environment loading |

The frontend calls FastAPI. FastAPI uses SQLAlchemy sessions to query Supabase
Postgres. Supabase is the database provider; SQLAlchemy is the Python database
access layer used by the backend.

## Service Package Layout

`backend/app/services/` is split by backend responsibility:

| Package | Purpose |
| --- | --- |
| `services/views/` | Read-model services and shared response mappers for findings and sources |
| `services/topology/` | Business-unit, business-service, application, asset, topology analytics, and topology maintenance workflows |
| `services/scoring/` | Persisted CRQ scoring jobs and rollup helpers |
| `services/fair/` | FAIR-style frequency, magnitude, loss prediction, controls, and scope prediction logic |
| `services/security_score.py` | Controls/security-score calculation helpers used by controls routes |

`services/views/helpers.py` contains shared display-score, risk-band, sorting,
and model-to-schema mapper helpers used by read routes. `app/api/common.py`
exists only as a small API-facing compatibility facade for those shared helpers.

## Request Flow Examples

### Findings List

1. `backend/app/api/findings.py` receives pagination, sort, source, and risk-band inputs.
2. `backend/app/services/views/findings.py` validates filter behavior, calls repository queries, and maps models to response schemas.
3. `backend/app/repositories/findings.py` builds SQLAlchemy finding queries.
4. `backend/app/models.py` supplies `Finding` and related ORM models.
5. `backend/app/schemas.py` supplies `PaginatedFindings` and `FindingSummary`.

### Asset Detail And Findings

1. `backend/app/api/topology/assets.py` accepts asset route inputs.
2. `backend/app/services/topology/assets.py` loads the asset, applies finding filters, handles missing assets, and builds response payloads.
3. `backend/app/repositories/topology.py` supplies topology-aware asset lookup helpers.
4. Shared mapper helpers in `services/views/helpers.py` convert ORM rows to API schemas.

### CRQ Scoring

Manual scripts under `backend/scripts/manual/` call `services/scoring/` modules
directly. These jobs calculate persisted CRQ fields for findings, assets,
applications, business services, and business units. HTTP read routes surface
those persisted scores; they do not recalculate CRQ scores during request
handling.

### FAIR Loss Prediction

FAIR routes call services under `services/fair/`. These services combine
persisted asset/finding/topology context with FAIR frequency, magnitude, control,
and risk helpers. FAIR logic is separate from CRQ scoring logic even though both
can read the same persisted finding and asset context.

## Repository And Database Access

Repositories should contain reusable SQLAlchemy query construction and database
fetch helpers. Services can still compose simple queries when the query is
tightly coupled to one workflow, but shared lookups belong in repositories.

Current repository packages:

- `backend/app/repositories/findings.py`
- `backend/app/repositories/topology.py`

Database sessions come from `backend/app/core/db.py`. The database target is
Supabase Postgres in deployed/local Supabase-backed flows, while backend tests
use SQLite fixtures where practical.

## API Boundary Rules

API modules should stay thin:

- accept path/query/body inputs
- wire dependencies such as `get_db`
- declare response schemas
- call services
- avoid SQLAlchemy query construction

The architecture test `backend/tests/architecture/test_api_layering.py` checks
that active API modules do not directly use query-heavy SQLAlchemy patterns such
as `db.query`, `joinedload`, or `func.count`.

## Where New Code Should Go

| Change type | Preferred location |
| --- | --- |
| New HTTP route | `backend/app/api/` |
| New read response workflow | `backend/app/services/views/` or `backend/app/services/topology/` |
| New reusable database lookup | `backend/app/repositories/` |
| New API contract | `backend/app/schemas.py` |
| New database column/table model | `backend/app/models.py` plus migration docs/files |
| New CRQ scoring behavior | `backend/app/services/scoring/` |
| New FAIR modeling behavior | `backend/app/services/fair/` |
| New controls/security score behavior | `backend/app/services/security_score.py` unless controls grows into its own package |

Keep service modules focused by workflow or domain. Avoid adding broad generic
helpers unless they remove repeated behavior across multiple services.
