# Schema Replacement README

This document is the working plan for replacing most of the current local database schema with the upcoming dataset.

No implementation decisions in this file are final until the new data is inspected. The purpose of this README is to lock the execution order so the app can be updated safely without breaking ingestion, scoring, API responses, or the UI.

## Current Direction

The expected change is not a normal CSV import update.

The current assumption is:

- the incoming dataset may replace most of the existing `scored_findings` shape
- the existing import logic is likely temporary
- scoring may need to change, but only after the new schema is defined
- backward compatibility should not be assumed by default

## Current Schema Baseline

The current app is built around a single primary table:

- `scored_findings` in `backend/app/models.py`

The current schema includes these major groups:

- source and asset identity
- vulnerability identity and KEV enrichment
- CVSS and EPSS values
- exploit/vector context
- temporal metadata
- exposure metadata
- computed `risk_score` and `risk_band`
- lifecycle fields
- manual disposition fields

The current ingestion path is:

- upload CSV to `POST /scores/seed/qualys-csv`
- parse in `backend/app/seed.py`
- compute scores
- append rows into local SQLite at `backend/vulncontext.db`

The current API and frontend assume this shape:

- API response models in `backend/app/schemas.py`
- route behavior in `backend/app/api/scores.py`
- frontend types in `frontend/src/api.ts`
- dashboard and finding detail UI components under `frontend/src/components/dashboard/`

## What Will Likely Change

Once the new dataset is inspected, changes are likely in one or more of these areas:

- primary table structure
- column names and types
- required versus optional fields
- source import rules
- scoring inputs
- API response contract
- frontend table columns and drawer/detail layout
- tests and fixture data

## Approval Checklist Before Implementation

These are the decisions that need to be explicit before code changes begin:

1. Is this a full schema replacement or a partial extension of the current schema?
2. Should the existing local DB data be preserved, migrated, or discarded?
3. Should the new dataset continue using `scored_findings`, or should a new primary table be introduced?
4. Should old API fields remain available through compatibility aliases, or can the frontend contract change directly?
5. Should scoring changes wait until the new schema is stable, or be included in the same implementation pass?
6. Should import behavior remain append-only, or move to replace/reconcile semantics?

## Planned Execution Sequence

This is the order of work once the new dataset is provided.

### Phase 1: Inspect Incoming Data

Goals:

- inspect headers and sample rows
- determine true data types
- identify nullability and malformed patterns
- inventory all columns

Output:

- a column mapping table from incoming data to app fields

### Phase 2: Define The New Canonical Schema

Goals:

- decide what the new main table should be
- decide which current columns survive
- decide which current columns are removed or renamed
- decide which incoming columns become stored fields versus derived fields

Output:

- approved canonical schema for the app

### Phase 3: Plan Migration Strategy

Goals:

- determine whether local DB data is migrated or reset
- define how SQLite compatibility should work during transition
- decide whether old routes and frontend code need temporary compatibility support

Output:

- migration plan for local development database behavior

### Phase 4: Implement Backend Model And Import Path

Primary files:

- `backend/app/models.py`
- `backend/app/core/db.py`
- `backend/app/seed.py`

Goals:

- update SQLAlchemy models
- update lightweight SQLite compatibility logic
- replace current CSV parsing with the new schema-aware parser
- validate incoming rows against the new contract

### Phase 5: Implement Scoring Changes

Primary files:

- `backend/app/scoring.py`
- `backend/app/core/risk_weights.py`

Goals:

- decide which new columns affect score inputs
- revise risk scoring only after the new data model is stable
- keep scoring logic aligned with real available data

### Phase 6: Update API Contract

Primary files:

- `backend/app/schemas.py`
- `backend/app/api/scores.py`

Goals:

- expose the new fields
- remove fields that no longer exist
- adjust sort/filter/query behavior where needed
- keep route behavior aligned with the new DB model

### Phase 7: Update Frontend

Primary files:

- `frontend/src/api.ts`
- `frontend/src/hooks/useScoresData.ts`
- `frontend/src/components/dashboard/RiskTable.tsx`
- `frontend/src/components/dashboard/VulnerabilityDrawer.tsx`
- `frontend/src/components/integrations/IntegrationsPage.tsx`

Goals:

- align TypeScript interfaces with backend output
- replace old UI assumptions about finding shape
- decide which new fields belong in summary, table, filters, and detail views

### Phase 8: Verification

Primary files:

- `backend/tests/test_endpoints.py`
- `backend/tests/test_scoring.py`
- other affected tests

Goals:

- verify import works for the new dataset
- verify validation errors are precise
- verify the API returns the new schema correctly
- verify the frontend still renders core workflows

## Current-To-New Schema Comparison

The staged file `finding_clean_sample.csv` contains 55 columns and represents a Brinqa/Wiz finding model rather than the old Qualys-style scoring record.

Observed columns:

- `uid`
- `display_name`
- `cve_ids`
- `cve_record_names`
- `status`
- `status_category`
- `source_status`
- `compliance_status`
- `severity`
- `risk_factor_names`
- `risk_factor_values`
- `age_in_days`
- `first_found`
- `last_found`
- `due_date`
- `cisa_due_date_expired`
- `target_count`
- `target_ids`
- `target_names`
- `attack_pattern_names`
- `attack_technique_names`
- `attack_tactic_names`
- `base_risk_score`
- `risk_score`
- `risk_rating`
- `id`
- `record_link`
- `summary`
- `description`
- `type_display_name`
- `type_id`
- `date_created`
- `last_updated`
- `sla_days`
- `sla_level`
- `risk_owner_name`
- `remediation_owner_name`
- `source_count`
- `source_uids`
- `source_record_uids`
- `source_links`
- `connector_names`
- `source_connector_names`
- `connector_categories`
- `data_integration_titles`
- `informed_user_names`
- `data_model_name`
- `created_by`
- `updated_by`
- `risk_scoring_model_name`
- `sla_definition_name`
- `confidence`
- `risk_factor_offset`
- `category_count`
- `categories`

### Current Schema Elements Expected To Be Replaced

- `finding_id` replaced by `uid`
- `asset_id` replaced by `target_ids` and `target_names`
- `hostname`, `ip_address`, `operating_system`, and `asset_type` are no longer primary columns in the staged data
- `asset_criticality` is not present as a direct field
- `cve_id` becomes a derived or normalized value from `cve_ids` and `cve_record_names`
- `cwe_id` is not present in the staged sample
- `cvss_score` is functionally replaced by `base_risk_score`
- `epss_score` is not present in the staged sample
- `internet_exposed` is not present as a direct field
- `auth_required` is not present as a direct field
- exploit-vector fields such as `attack_vector`, `privileges_required`, `user_interaction`, and `vector_string` are replaced by ATT&CK-style fields
- `vuln_age_days` is replaced by `age_in_days`
- `first_detected` and `last_detected` are replaced by `first_found` and `last_found`
- `times_detected`, `port`, `service`, and `detection_method` are not present in the staged sample
- KEV enrichment columns are not present in the staged sample

### Current Schema Elements Expected To Survive

- local primary key `id`
- app-level `source`
- `description`
- `risk_score`
- new app-owned override fields for internal risk and remediation workflow
- manual disposition fields
- event logging through `finding_events`
- a temporary compatibility `risk_band` field, expected to mirror or derive from `risk_rating`
- a temporary compatibility `lifecycle_status` field, expected to derive from `status_category` or `source_status`

### New Columns Expected To Be Added

- status workflow fields
- SLA/compliance fields
- ownership fields
- connector/integration provenance fields
- ATT&CK-style attack pattern, technique, and tactic fields
- Brinqa/Wiz record identifiers and links
- model metadata such as `risk_scoring_model_name` and `sla_definition_name`
- app-owned fields:
  - `internal_risk_score`
  - `internal_risk_band`
  - `internal_risk_notes`
  - `remediation_summary`
  - `remediation_plan`
  - `remediation_notes`
  - `remediation_status`
  - `remediation_due_date`
  - `remediation_updated_at`
  - `remediation_updated_by`

### Current Columns Expected To Be Removed Or Deprecated

- old Qualys-specific asset context fields
- manual scoring inputs that no longer exist in source data
- KEV/EPSS-specific columns unless they are reintroduced later as enrichment

### Scoring Inputs Expected To Change

- `risk_score` already exists in the staged data and may not need to be recomputed immediately
- `risk_rating` appears to replace the current app concept of `risk_band`
- `base_risk_score`, `risk_factor_names`, `risk_factor_values`, and `risk_factor_offset` are the most likely inputs for a later scoring rewrite
- any EPSS or KEV-based logic should be treated as optional enrichment, not as baseline required input

### Frontend Views Expected To Change

- the findings table should pivot from asset/host-centric columns to status, risk, target, owner, and due-date columns
- the detail drawer should show source metadata, attack context, SLA data, and record links
- filters should move toward `status_category`, `risk_rating`, `compliance_status`, `sla_level`, and integration/source metadata

## Working Rule For The Next Step

When the new file is dropped into `backend/data/import_staging/`, the first task is not implementation.

The first task is:

- inspect the dataset
- produce the mapping
- compare current schema versus new schema
- return that diff for approval

Only after that approval should backend, API, scoring, and frontend code change.
