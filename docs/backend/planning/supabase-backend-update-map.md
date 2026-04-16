# Supabase Backend Update Map

This document inventories the backend areas that will need changes if the backend is going to use the live Supabase database as the primary store.

It is intentionally a change map, not a detailed implementation plan.

Related baseline:

- `docs/backend/current/supabase-database.md`

## Current Situation

The live Supabase project currently exposes:

- `public.assets`
- `public.findings`

The backend currently runs against a richer local SQLAlchemy schema, usually backed by SQLite unless `DATABASE_URL` is set.

That means almost every backend module falls into one of three categories:

- rewrite for live Supabase
- remove or defer
- keep with minor changes

## Rewrite For Live Supabase

These files are built around the local SQLAlchemy schema and will need substantive work.

### Database layer

- `backend/app/core/db.py`
  The backend currently resolves to SQLite by default and creates a generic SQLAlchemy engine. This needs to become a deliberate Supabase/Postgres connection strategy if the backend is meant to read and write the live project.

- `backend/app/main.py`
  Startup currently calls `Base.metadata.create_all(bind=engine)`. That is compatible with local development, but it is the wrong model for a Supabase-first backend.

- `backend/app/models.py`
  The ORM schema does not match the live Supabase table names, keys, or column set. This file is the largest structural mismatch.

### Findings API

- `backend/app/api/findings.py`
  Every route queries `models.ScoredFinding`, but the live table is `public.findings`. The response mapper also expects many fields that do not exist in Supabase today.

- `backend/app/api/common.py`
  Sorting, filtering, serialization, scoring display, and disposition handling all assume the richer `ScoredFinding` model.

- `backend/app/schemas.py`
  `ScoredFindingOut` and related response models contain far more fields than the live Supabase table currently provides.

### Imports and asset graph

- `backend/app/api/imports.py`
  Imports currently parse staged CSV rows into local ORM objects, enrich them, and upsert into `scored_findings`. This path will need redesign if imports should populate Supabase directly.

- `backend/app/seed.py`
  This module parses CSV data into the richer local finding model. It likely needs to be split into:
  - source parsing/normalization that can stay
  - local-model construction that must change

- `backend/app/services/asset_graph.py`
  This service assumes local integer foreign keys and local upserts. The live Supabase `assets` table uses external text `asset_id` as the primary key.

### Source management

- `backend/app/api/sources.py`
  This router depends on `ScoredFinding.source`, `risk_band`, `internal_risk_band`, and `risk_rating`. Those fields do not exist in the live `public.findings` table.

## Remove Or Defer

These modules depend on tables or enrichment layers that do not currently exist in the live Supabase schema. They should either be removed for the first Supabase cut or deferred until the schema is expanded.

### Risk scoring configuration

- `backend/app/api/risk_weights.py`
- `backend/app/core/risk_weights.py`
- `backend/app/scoring.py`

These files assume:

- a persisted `risk_scoring_config` table
- per-row internal rescoring
- stored `internal_risk_score` and `internal_risk_band`

If Supabase remains thin, this feature set should be deferred or rethought.

### Enrichment cache pipeline

- `backend/app/epss.py`
- `backend/app/services/nvd_enrichment.py`
- `backend/app/services/kev_enrichment.py`
- `backend/app/api/admin.py`
- `backend/scripts/refresh_finding_enrichment.py`
- `backend/scripts/sync_nvd_cache.py`

These depend on local enrichment cache tables and rich finding columns that are not in the current live Supabase schema.

### Event and scan history model

- `FindingEvent` and `ScanRun` in `backend/app/models.py`
- disposition event recording in `backend/app/api/common.py`

These features require app-owned tables that are not present in Supabase today.

### Current backend tests

- `backend/tests/conftest.py`
- most files under `backend/tests/`

The test suite currently spins up SQLite tables from the local ORM. Those tests will not validate a Supabase-first backend without a large rewrite.

## Keep With Minor Changes

These files are still useful, but they may need narrower changes once the DB direction is decided.

### App shell and environment loading

- `backend/app/__init__.py`
- `backend/app/api/__init__.py`
- `backend/app/core/env.py`

These are structural and can mostly stay unless route registration changes.

### Brinqa extraction and CSV preparation scripts

- `backend/scripts/pull_asset_business_context.py`
- `backend/scripts/pull_asset_findings.py`
- `backend/scripts/export_assets_for_supabase.py`
- `backend/scripts/export_findings_for_supabase.py`
- `backend/scripts/brinqa_source_helpers.py`

These are closer to source acquisition and export shaping than to backend API persistence. They may stay useful if the chosen approach is:

- pull from Brinqa
- normalize locally
- load to Supabase

They still may need field-level updates once the destination schema is finalized.

## Practical Change Buckets

If the goal is to make the backend work against the current live Supabase schema with the smallest first cut, the likely order is:

1. Replace local DB assumptions.
2. Rewrite findings reads around `public.findings`.
3. Rewrite asset lookups around `public.assets`.
4. Remove or disable local-only scoring, enrichment, and event features.
5. Redesign imports to write directly to Supabase.
6. Rewrite tests around the actual supported API contract.

## Lowest-Risk First Implementation Slice

If we want a phased migration, the safest first slice is:

- keep the live Supabase schema thin
- make the backend read-only first
- support `/health`, findings list/detail/summary, and asset-context-backed display fields only
- postpone scoring weights, KEV reload, disposition events, and local enrichment cache features

That approach avoids trying to move the entire local app data model into Supabase in one step.
