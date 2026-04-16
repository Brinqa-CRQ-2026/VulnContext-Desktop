# Asset Pull Workflow

This document covers the current backend scripts used to pull asset and finding data from Brinqa and shape it into thin CSVs for Supabase import.

## Purpose

The current workflow has three layers:

1. Pull base host asset context from Brinqa.
2. Export thin asset rows for Supabase import.
3. Export thin finding rows for Supabase import.

## Data Sources

These scripts pull from the Brinqa environment using API requests such as:

- `POST /api/caasm/bql`
- `POST /api/caasm/bql/related`
- `POST /api/caasm/model/qualysVmHosts/<id>/`
- `POST /api/caasm/model/servicenowHosts/<id>/`

Authentication is expected through environment variables:

- `BRINQA_BEARER_TOKEN`
- optional `BRINQA_JSESSIONID`

## Current Scripts

### `backend/scripts/pull_asset_business_context.py`

Pulls the base Host asset dataset and writes:

- `backend/data/asset_business_context.csv`

This is the raw base dataset used by later export steps.

### `backend/scripts/export_assets_for_supabase.py`

Reads `asset_business_context.csv`, resolves related Qualys and ServiceNow detail where available, and writes:

- `backend/data/assets_for_supabase.csv`

This is the thin asset CSV aligned to the current `public.assets` table shape.

### `backend/scripts/pull_asset_findings.py`

Pulls thin vulnerability rows for a single asset id.

Useful for inspection and debugging one asset’s findings before running the full export.

### `backend/scripts/export_findings_for_supabase.py`

Reads `asset_business_context.csv`, pulls findings for every asset, and writes:

- `backend/data/findings_for_supabase.csv`

This is the thin findings CSV aligned to the current `public.findings` table shape.

### `backend/scripts/brinqa_source_helpers.py`

Shared helper used by the export scripts for:

- request/session setup
- related-source lookup
- payload normalization
- CSV writing support

## How The Scripts Fit Together

### Base asset workflow

1. Run `pull_asset_business_context.py`
2. Run `export_assets_for_supabase.py`
3. Import `backend/data/assets_for_supabase.csv` into Supabase

### Findings workflow

1. Run `pull_asset_business_context.py` if the base asset list is stale
2. Run `export_findings_for_supabase.py`
3. Import `backend/data/findings_for_supabase.csv` into Supabase

## Current Outputs

- `backend/data/asset_business_context.csv`
  Base host asset context from Brinqa.

- `backend/data/assets_for_supabase.csv`
  Thin asset rows for `public.assets`.

- `backend/data/findings_for_supabase.csv`
  Thin finding rows for `public.findings`.

## Notes

- These scripts are source-acquisition tools, not backend API routes.
- They are still useful in the current Supabase-first flow.
- Older single-purpose scripts described in previous docs have been removed from the active backend.
