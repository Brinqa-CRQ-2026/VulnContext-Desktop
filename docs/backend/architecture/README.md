# Backend Architecture Map

## Summary

This folder explains where the major backend responsibilities live.

## Layer Map

| Layer | Responsibility | Examples |
| --- | --- | --- |
| `backend/app/api/` | HTTP routes and request validation | findings, topology, sources |
| `backend/app/services/` | orchestration, business rules, response shaping | topology view, findings view, scoring, Brinqa detail |
| `backend/app/repositories/` | query construction and database access helpers | findings and topology repositories |
| `backend/app/models.py` | ORM models | assets, findings, topology tables, enrichment tables |
| `backend/app/schemas.py` | response models | paginated collections, detail payloads, analytics payloads |
| `backend/app/core/` | DB and environment setup | session factory, env loading |

## The Next Pages

- [Database Reference](database.md)
- [Scoring Overview](../scoring/README.md)
- [Test Matrix](../testing/README.md)

