# Manual Backend Workflows

## Summary

These scripts are meant for a human operator to run directly. They are not triggered by GitHub Actions.

## Scripts

| Purpose | Script |
| --- | --- |
| Pull asset business context from Brinqa | `backend/scripts/manual/pull_asset_business_context.py` |
| Pull one-off asset findings for inspection | `backend/scripts/manual/pull_asset_findings.py` |
| Export assets for Supabase import | `backend/scripts/manual/export_assets_for_supabase.py` |
| Export findings for Supabase import | `backend/scripts/manual/export_findings_for_supabase.py` |
| Reseed assets in Supabase | `backend/scripts/manual/reseed_assets_for_supabase.py` |
| Run CRQ finding scoring | `backend/scripts/manual/score_crq_findings_v1.py` |
| Run CRQ asset scoring | `backend/scripts/manual/score_crq_assets_v1.py` |

## Compatibility Wrappers

- `backend/scripts/manual/score_findings_crq_v1.py`
- `backend/scripts/manual/score_assets_crq_v1.py`

