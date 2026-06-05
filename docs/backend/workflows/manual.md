# Manual Backend Workflows

## Summary

These scripts are meant for a human operator to run directly. They are not triggered by GitHub Actions.

## Scripts

| Purpose | Script |
| --- | --- |
| Run CRQ finding scoring | `backend/scripts/manual/score_crq_findings_v1.py` |
| Run CRQ asset scoring | `backend/scripts/manual/score_crq_assets_v2.py` |
| Run CRQ application scoring | `backend/scripts/manual/score_crq_applications_v2.py` |
| Run CRQ business-service scoring | `backend/scripts/manual/score_crq_business_services_v1.py` |
| Benchmark topology routes | `backend/scripts/manual/benchmark_topology_routes.py` |

## Legacy Seed Scripts

One-time Brinqa pull/export/reseed scripts used for the original Supabase seed now live in `backend/legacy/scripts/`.
