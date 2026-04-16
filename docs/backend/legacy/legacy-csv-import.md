# Legacy CSV Import And Seeding

This documents the pre-refactor CSV import flow before it was deferred from the active runtime.

## What It Did

- Accepted staged findings CSV uploads through `/imports/findings/csv`
- Parsed rows into the local `ScoredFinding` model
- Enriched findings with EPSS and NVD cache data
- Upserted asset context and findings into the local SQLite/Postgres schema

## Where It Lived

- `backend/app/api/imports.py`
- `backend/app/seed.py`
- `backend/app/services/asset_graph.py`

## Runtime Dependencies

- `scored_findings`
- `assets`
- `risk_scoring_config`
- `epss_scores`
- `nvd_cve_cache`

## Inputs And Outputs

- Input: uploaded CSV plus source name
- Output: inserted row count, source label, and total findings after import

## Core Rules

- CSV had to be UTF-8 and under the request size limit
- source name was required
- imports attempted enrichment before persistence
- finding upserts used a derived `finding_key`

## External Dependencies

- EPSS refresh data
- NVD cache data

## Reimplementation Requirements

- decide whether imports write directly to Supabase thin tables or into a separate staging path
- restore CSV parsing rules from `seed.py`
- restore finding identity/upsert semantics
- restore any enrichment steps that still belong in the import path
