# Asset Scoring Schema Plan

This document is the reference for the lean asset schema we want before building asset-level and rollup scoring.

It combines two decisions that now need to stay aligned:

- `public.assets.asset_id` is the only canonical stored asset identifier
- `public.assets` should only keep scoring-relevant fields plus the minimum connector IDs needed for future enrichment

This document is intentionally implementation-oriented so it can guide:

- Supabase schema cleanup
- import/export script cleanup
- ORM and API cleanup
- future scoring script design at the asset, application, business service, and company levels

For current runtime behavior, see [scoring-model.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring-model.md).

## Summary

Refactor the asset model so `public.assets.asset_id` is the only canonical stored asset identifier.

Keep only the Qualys and ServiceNow host IDs as optional connector-specific fetch shortcuts:

- `qualys_vm_host_id`
- `servicenow_host_id`

Drop all other duplicate asset identity fields and extra connector metadata from the main asset table.

The target asset table should be scoring-focused:

- business importance / criticality
- exposure
- data sensitivity
- asset type context
- normalized hierarchy links

The table should not carry display fluff, contact metadata, or connector metadata that is not required for scoring or re-enrichment.

## Scoring Hierarchy

### 1. Finding level

Finding risk starts at the vulnerability itself.

Primary inputs:

- base vulnerability risk score
- CVSS
- EPSS
- KEV
- vulnerability age
- exploitability-related context

### 2. Asset level

Asset risk aggregates the risk of findings attached to the asset, then adjusts that risk using asset context.

Primary asset-level concerns for now:

- exposure
- business importance / asset criticality
- data sensitivity
- asset type context

This schema deliberately does not keep scan freshness fields in the main asset table because the lean asset-table decision already removed them from this pass.

### 3. Application level

Application risk is the aggregated weighted risk of supporting assets.

### 4. Business service level

Business service risk is the aggregated weighted risk of supporting applications and direct assets, weighted by service importance.

### 5. Company level

Company risk is the aggregated organizational risk from the level below it.

## Current Lean Direction

The agreed lean direction for `public.assets` is:

- `asset_id` is the sole canonical asset reference across the database, scripts, ORM models, and API serialization
- Qualys and ServiceNow IDs are kept only as optional enrichment shortcuts
- duplicate asset identity fields are removed
- non-scoring operational and display fields are removed from the main asset table

Brinqa flow assumptions:

- findings and re-enrichment start from `asset_id`
- related-source discovery uses `asset_id`
- cached connector source IDs are optional accelerators, not required identity

## Column Classification

The asset columns below are split into:

- keep
- keep for enrichment only
- remove
- add

### Keep

These fields stay on `public.assets` because they support scoring directly or support rollups above the asset layer.

#### `asset_id`

Keep.

Why:

- Canonical external asset reference
- current Brinqa fetch flows already use it
- correct primary key for the asset table

#### `hostname`

Keep.

Why:

- Useful lightweight human-readable label
- helpful for debugging and validating score output

#### `internal_or_external`

Keep.

Why:

- Direct exposure signal
- useful until a more explicit exposure model is fully populated

#### `category`

Keep.

Why:

- Useful asset-type context
- can support future `asset_type_weight` derivation

#### `status`

Keep.

Why:

- Helps suppress or down-weight inactive or non-actionable assets
- useful for whether the asset should participate in scoring rollups

#### `compliance_status`

Keep for now.

Why:

- The earlier thinning plan kept it in the lean asset table
- it can still be useful as context until we decide whether to separate compliance from scoring entirely
- do not directly score from it unless we define an explicit rule

#### `pci`

Keep.

Why:

- Simple direct sensitivity signal
- useful input to future `data_sensitivity_score`

#### `pii`

Keep.

Why:

- Simple direct sensitivity signal
- useful input to future `data_sensitivity_score`

#### `asset_criticality`

Keep.

Why:

- Current direct business-importance signal on the asset
- useful input to future `business_criticality_score`

#### `company_id`

Keep for now.

Why:

- Needed for company-level rollups
- already exists as a normalized hierarchy FK

#### `business_unit_id`

Keep for now.

Why:

- Needed for intermediate aggregation
- already exists as a normalized hierarchy FK

#### `business_service_id`

Keep for now.

Why:

- Needed for business-service rollups
- preferred over free-form `business_service` text long term

#### `application_id`

Keep for now.

Why:

- Needed for application-level rollups
- preferred over free-form `application` text long term

### Keep For Enrichment Only

These fields are not scoring inputs, but they remain because they are the only connector-specific IDs we want cached on the asset row.

#### `qualys_vm_host_id`

Keep for enrichment only.

Why:

- Connector-specific external ID
- useful optional shortcut for future enrichment and drill-downs
- not canonical asset identity

#### `servicenow_host_id`

Keep for enrichment only.

Why:

- Connector-specific external ID
- useful optional shortcut for future enrichment and drill-downs
- not canonical asset identity

### Remove

These fields should be removed from the main asset table because they are duplicate identity, display-only, contact-oriented, or outside the lean scoring scope we already agreed on.

#### `uid`

Remove.

Why:

- duplicate asset identity
- `asset_id` is the only canonical reference we want to keep

#### `uuid`

Remove.

Why:

- duplicate asset identity
- not needed if `asset_id` remains canonical

#### `qualys_vm_host_uid`

Remove.

Why:

- extra connector metadata beyond the one Qualys ID we decided to keep

#### `qualys_vm_host_link`

Remove.

Why:

- drill-down/display metadata
- not needed in the lean scoring asset table

#### `qualys_vm_host_integration`

Remove.

Why:

- provenance metadata
- not needed if the only retained Qualys reference is the host ID

#### `servicenow_host_uid`

Remove.

Why:

- extra connector metadata beyond the one ServiceNow ID we decided to keep

#### `servicenow_host_link`

Remove.

Why:

- drill-down/display metadata
- not needed in the lean scoring asset table

#### `servicenow_host_integration`

Remove.

Why:

- provenance metadata
- not needed if the only retained ServiceNow reference is the host ID

#### `dnsname`

Remove.

Why:

- display-oriented
- overlaps with `hostname`
- not needed for scoring

#### `tracking_method`

Remove.

Why:

- operational connector metadata
- not part of the lean scoring model

#### `owner`

Remove.

Why:

- contact-oriented
- not a scoring input

#### `service_team`

Remove.

Why:

- ownership metadata
- not a scoring input

#### `division`

Remove.

Why:

- org-display field
- use normalized hierarchy instead

#### `it_sme`

Remove.

Why:

- contact-oriented
- not a scoring input

#### `it_director`

Remove.

Why:

- contact-oriented
- not a scoring input

#### `location`

Remove.

Why:

- outside the lean scoring scope for this pass

#### `device_type`

Remove.

Why:

- overlaps with `category`
- prefer one simple asset-type signal

#### `virtual_or_physical`

Remove.

Why:

- outside the agreed lean scoring scope

#### `compliance_flags`

Remove.

Why:

- free-form and ambiguous
- poor fit for clean scoring logic

#### `public_ip_addresses`

Remove.

Why:

- excluded by the earlier thinning decision
- exposure should move toward explicit derived scoring fields instead of raw multi-value text blobs

#### `private_ip_addresses`

Remove.

Why:

- excluded by the earlier thinning decision
- not needed in the lean scoring asset table

#### `last_authenticated_scan`

Remove.

Why:

- excluded by the earlier thinning decision
- keep this pass simple instead of mixing in freshness/confidence tracking

#### `last_scanned`

Remove.

Why:

- excluded by the earlier thinning decision
- keep this pass simple instead of mixing in freshness/confidence tracking

#### `application`

Remove from the target schema once normalized routes are updated.

Why:

- free-form duplicate of `application_id`
- keep normalization direction clear

#### `business_service`

Remove from the target schema once normalized routes are updated.

Why:

- free-form duplicate of `business_service_id`
- keep normalization direction clear

### Add

These fields should be added so asset-level scoring inputs are explicit instead of buried inside vague text fields.

#### `exposure_score`

Add.

Why:

- explicit exposure input for asset-level scoring

Suggested type:

- `double precision`

#### `business_criticality_score`

Add.

Why:

- explicit business-importance input
- cleaner than relying only on raw `asset_criticality`

Suggested type:

- `double precision`

#### `data_sensitivity_score`

Add.

Why:

- explicit sensitivity input
- cleaner than inferring everything indirectly from `pci` and `pii`

Suggested type:

- `double precision`

#### `asset_type_weight`

Add.

Why:

- explicit asset-type weighting input
- avoids spreading type logic across ad hoc rules

Suggested type:

- `double precision`

#### `is_public_facing`

Add.

Why:

- explicit exposure flag
- easier to use than repeatedly inferring exposure from raw fields

Suggested type:

- `boolean`

#### `has_sensitive_data`

Add.

Why:

- explicit summary sensitivity flag
- useful for filtering and rollups

Suggested type:

- `boolean`

#### `crown_jewel_flag`

Add.

Why:

- explicit high-importance designation for exceptional assets

Suggested type:

- `boolean`

#### `internet_exposed_flag`

Add.

Why:

- explicit exposure flag distinct from broad internal/external classification

Suggested type:

- `boolean`

## Fields That Should Move Elsewhere

These fields are useful only if we want them for operational workflows, not scoring:

- `owner`
- `service_team`
- `it_sme`
- `it_director`

If retained anywhere, they should move to a separate stewardship or ownership table rather than staying on `assets`.

Compliance-oriented detail should also move elsewhere if we expand it later:

- `compliance_flags`
- any richer compliance metadata beyond the simple `compliance_status` field we are temporarily keeping

Connector-specific metadata beyond the two retained IDs should stay out of `assets`.

## Recommended Target Asset Schema

This is the practical target shape for `public.assets`.

```sql
create table public.assets (
  asset_id text primary key,
  hostname text,

  company_id uuid references public.companies(id) on delete set null,
  business_unit_id uuid references public.business_units(id) on delete set null,
  business_service_id uuid references public.business_services(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,

  category text,
  internal_or_external text,
  status text,
  compliance_status text,

  pci boolean,
  pii boolean,
  asset_criticality integer,

  qualys_vm_host_id text,
  servicenow_host_id text,

  exposure_score double precision,
  business_criticality_score double precision,
  data_sensitivity_score double precision,
  asset_type_weight double precision,

  is_public_facing boolean,
  has_sensitive_data boolean,
  crown_jewel_flag boolean,
  internet_exposed_flag boolean
);
```

## Implementation Notes

- Make `asset_id` the sole canonical asset reference across database, scripts, ORM models, and API serialization.
- Keep only these source-reference fields on assets:
  - `asset_id`
  - `qualys_vm_host_id`
  - `servicenow_host_id`
- Update `backend/scripts/export_assets_for_supabase.py` so the exported CSV only emits the kept columns.
- Update ORM and API mappings so removed asset fields are no longer referenced by serializers.
- If any current UI still reads removed asset fields, either stop returning them or make those fields nullable/omitted in this pass without fallback fetch.
- Keep the topology FK columns for now while current topology routes still depend on them.
- Once topology routes are fully normalized, remove free-form `business_service` and `application` fields rather than keeping both representations.

## Suggested Next Steps

1. Apply the asset schema thinning in Supabase.
2. Update the asset export script to match the target schema exactly.
3. Update ORM and API models to stop referencing removed columns.
4. Add the explicit scoring fields with nullable defaults.
5. Build asset-level scoring logic using:
   - vulnerability aggregation from findings
   - `asset_criticality`
   - `internal_or_external`
   - `pci`
   - `pii`
   - `category`
   - explicit derived scoring fields
6. Build rollup logic from:
   - findings -> assets
   - assets -> applications
   - applications -> business services
   - business services -> companies

## Assumptions

- `asset_id` is Brinqa `Host.id` and is sufficient to re-fetch findings and rediscover related Qualys and ServiceNow sources.
- Qualys and ServiceNow source IDs are useful cache fields, but not canonical identity.
- This is intentionally asset-only. Findings thinning and replacing local `findings.id` remain separate follow-up work.
- The target asset table is scoring-focused, not a rich asset detail table.
