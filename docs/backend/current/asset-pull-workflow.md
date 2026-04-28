# Asset And Findings Script Workflow

The current data pipeline is script-driven.

## Core export flow

1. Run `backend/scripts/pull_asset_business_context.py`
   Pull raw asset/business-context data from Brinqa.
2. Run `backend/scripts/export_assets_for_supabase.py`
   Convert pulled asset data into the CSV shape expected by `public.assets`.
3. Run `backend/scripts/reseed_assets_for_supabase.py --validate-only`
   Check the export before reseeding.
4. Run `backend/scripts/reseed_assets_for_supabase.py`
   Reseed asset rows and refresh topology foreign keys.
5. Run `backend/scripts/export_findings_for_supabase.py`
   Emit the current thin findings CSV for import into `public.findings`.

## Supporting scripts

- `backend/scripts/pull_asset_findings.py`
  Useful for one-asset inspection and debugging.
- `backend/scripts/brinqa_source_helpers.py`
  Shared session, auth-header, and CSV helpers used by the export scripts.

## Enrichment and scoring

- `backend/scripts/sync_epss.py`
- `backend/scripts/sync_kev.py`
- `backend/scripts/sync_nvd.py`
- `backend/scripts/sync_daily.py`
- `backend/scripts/score_crq_findings_v1.py`

The canonical findings scorer entrypoint is `score_crq_findings_v1.py`, which prints the active version from `app.services.crq_finding_scoring.CRQ_VERSION`.
