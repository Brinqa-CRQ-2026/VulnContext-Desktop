# Supabase Database

This document describes the live Supabase database currently connected to the project and the topology expansion staged in the repo for the next schema pass.

Snapshot date: 2026-04-22
Supabase project URL: `https://nlcvpwhdukskonswryno.supabase.co`
Observed schema: `public`

## Topology Expansion Staged In Repo

The repo now includes a normalized topology layer above assets:

- `public.companies`
- `public.business_units`
- `public.business_services`
- `public.applications`

It also stages nullable foreign keys on `public.assets`:

- `company_id`
- `business_unit_id`
- `business_service_id`
- `application_id`

Seed source-of-truth files live in [docs/backend/topology-seed](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/topology-seed), and the migration/backfill SQL lives in [topology-expansion.sql](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/topology-seed/topology-expansion.sql).

Browse order after this expansion:

- company
- business_unit
- business_service
- optional application
- asset
- findings

## Current Live Tables

The live database currently exposes two populated tables in `public`:

- `public.assets`
- `public.findings`

Both tables have RLS enabled.

Observed row counts on 2026-04-15:

- `public.assets`: 350 rows
- `public.findings`: 12,246 rows

Tracked Supabase migrations visible through the connected MCP session:

- `20260423051633_thin_assets_and_findings_for_scoring_backend`
- `20260423051739_secure_enrichment_tables_and_add_fk_indexes`
- `20260426131500_asset_findings_query_indexes`

## Table: `public.assets`

Primary key:

- `asset_id` (`text`)

Columns:

- `asset_id` `text` not null
- `uid` `text`
- `hostname` `text`
- `dnsname` `text`
- `uuid` `text`
- `tracking_method` `text`
- `application` `text`
- `business_service` `text`
- `owner` `text`
- `service_team` `text`
- `division` `text`
- `it_sme` `text`
- `it_director` `text`
- `location` `text`
- `internal_or_external` `text`
- `device_type` `text`
- `category` `text`
- `virtual_or_physical` `text`
- `status` `text`
- `compliance_status` `text`
- `compliance_flags` `text`
- `pci` `boolean`
- `pii` `boolean`
- `asset_criticality` `integer`
- `public_ip_addresses` `text`
- `private_ip_addresses` `text`
- `last_authenticated_scan` `timestamptz`
- `last_scanned` `timestamptz`
- `qualys_vm_host_id` `text`
- `qualys_vm_host_uid` `text`
- `qualys_vm_host_link` `text`
- `qualys_vm_host_integration` `text`
- `servicenow_host_id` `text`
- `servicenow_host_uid` `text`
- `servicenow_host_link` `text`
- `servicenow_host_integration` `text`

Notes:

- This is a thin asset context table keyed by the external `asset_id`.
- There is no integer surrogate `id` column in the live Supabase table.
- `application` and `business_service` are currently stored as simple text fields.
- The staged topology expansion keeps those text fields during transition and adds normalized foreign keys alongside them.

## Table: `public.findings`

Primary key:

- `id` (`bigint`, sequence-backed)

Columns:

- `id` `bigint` not null default `nextval('findings_id_seq'::regclass)`
- `asset_id` `text` not null
- `finding_id` `text` not null
- `finding_uid` `text`
- `finding_name` `text`
- `status` `text`
- `cve_id` `text`
- `brinqa_base_risk_score` `double precision`
- `brinqa_risk_score` `double precision`
- `first_found` `timestamptz`
- `last_found` `timestamptz`
- `age_in_days` `double precision`
- `date_created` `timestamptz`
- `last_updated` `timestamptz`

Notes:

- This is a thin findings table aligned to imported vendor/source data.
- `asset_id` is stored as the external text asset identifier, not as a foreign key to a local integer `assets.id`.
- The live table does not yet include any `crq_*` fields.
- Those fields are staged in the repo via [20260423053000_add_crq_fields_to_findings.sql](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/supabase/migrations/20260423053000_add_crq_fields_to_findings.sql) and must be applied before the CRQ scorer can persist results.

## Current Data Shape

Examples observed during inspection:

- `assets.hostname` contains values like `RZWS6614`, `NUBC8602`, and `ARMV0295`
- `assets.application` contains values like `Identity Verify` and `Order Placement`
- `findings.cve_id` contains values like `CVE-2019-11581`, `CVE-2019-20372`, and `CVE-2023-22853`
- `findings.status` contains values like `Confirmed active` and `Confirmed fixed`

## Current Backend Interpretation

The active backend now matches the thin live runtime model:

- `assets` remains keyed by external `asset_id`
- `findings` remains attached to `asset_id`
- topology browsing is moving to normalized lookup tables above assets
- legacy `assets.business_service` and `assets.application` stay in place during transition

## Current Finding Summary Behavior

The backend summary serializer now treats CRQ as the primary app-owned score source when fields are present:

- display `risk_score` prefers `findings.crq_score`
- `cvss_score` prefers `findings.crq_cvss_score`
- `epss_score` prefers `findings.crq_epss_score`
- `isKev` prefers `findings.crq_is_kev`

Finding list and main finding detail responses are now persisted-data-only. If those `crq_*` fields are absent on a row, the backend returns `null` rather than supplementing them during response building.

The live note above still applies: if the connected database has not yet received the staged `crq_*` migration, those persisted fields will remain unavailable until the migration is applied.

The FK backfill strategy is exact-name matching only:

- `assets.business_service = business_services.name`
- `assets.application = applications.name` under the matched service

Missing source metadata stays `NULL`; the repo does not invent values for incomplete seed rows.
