# Backend Architecture Map

## Summary

This folder explains where the major backend responsibilities live and how
requests move through the FastAPI, service, repository, model, and schema
layers.

## Layer Map

| Layer | Responsibility | Examples |
| --- | --- | --- |
| `backend/app/api/` | HTTP routes, request validation, dependencies, response models | findings, topology, sources, controls |
| `backend/app/services/` | orchestration, business rules, scoring jobs, response shaping | `views/`, `topology/`, `scoring/`, `fair/` |
| `backend/app/repositories/` | query construction and database access helpers | findings and topology repositories |
| `backend/app/models.py` | ORM models | assets, findings, topology tables, enrichment tables |
| `backend/app/schemas.py` | response models | paginated collections, detail payloads, analytics payloads |
| `backend/app/core/` | DB and environment setup | session factory, env loading |

## Service Package Map

| Package | Responsibility |
| --- | --- |
| `backend/app/services/views/` | Read-model services and shared API response mappers |
| `backend/app/services/topology/` | Business-unit, business-service, application, asset, analytics, and topology maintenance workflows |
| `backend/app/services/scoring/` | CRQ scoring jobs and rollup helpers |
| `backend/app/services/fair/` | FAIR loss prediction and control modeling |
| `backend/app/services/security_score.py` | Security-score helper logic for controls routes |

API modules should stay thin. The architecture tests check that active route
modules do not contain direct SQLAlchemy query construction.

## The Next Pages

- [Detailed Backend Architecture](backend-architecture.md)
- [Database Reference](database.md)
- [Scoring Overview](../scoring/README.md)
- [Test Matrix](../testing/README.md)
