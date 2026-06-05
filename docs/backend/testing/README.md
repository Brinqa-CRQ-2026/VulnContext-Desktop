# Backend Test Matrix

## Summary

This page maps the current backend tests to the runtime behavior they protect.

## Coverage Map

| Test file | What it covers |
| --- | --- |
| `backend/tests/test_findings_api.py` | health endpoints, findings summary/list/detail, explicit finding enrichment, read-only sources summary |
| `backend/tests/test_topology_api.py` | topology drill-down, asset browsing, asset enrichment, asset findings, topology 503 behavior, normalized topology backfill |
| `backend/tests/test_crq_scoring.py` | CRQ finding scoring inputs, persistence, and banding |
| `backend/tests/test_asset_scoring.py` | CRQ asset aggregation and asset context scoring |
| `backend/tests/test_asset_reseed_csv.py` | asset reseed CSV behavior and topology backfill support |
| `backend/tests/test_backend_architecture.py` | route-layer thinness and layering regression checks |

## Behavior Areas

- boot and docs endpoints
- findings reads and enrichment
- topology and asset browsing
- asset enrichment contract states
- scoring persistence and bands
- backend layering rules

