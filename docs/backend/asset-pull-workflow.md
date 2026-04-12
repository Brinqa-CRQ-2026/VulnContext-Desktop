# Asset Pull Workflow

This document covers the backend scripts used to pull host asset data and source-specific enrichment data from Brinqa.

## Purpose

The current workflow has two layers:

1. Pull the main Host asset dataset used as the base asset view.
2. Pull source-specific enrichment data for a single asset from related source models such as Qualys VM Host and ServiceNow Host.

The source-specific scripts intentionally keep the stored output lean. They save the source lookup id and a small set of additional fields that are useful for scoring, criticality, or later on-demand fetches.

## Data Sources

All of these scripts pull from the UCSC Brinqa environment:

- Base asset dataset:
  - `POST /api/caasm/bql`
- Related source lookup:
  - `POST /api/caasm/bql/related`
- Qualys VM Host detail:
  - `POST /api/caasm/model/qualysVmHosts/<id>/`
- ServiceNow Host detail:
  - `POST /api/caasm/model/servicenowHosts/<id>/`

The scripts use a Brinqa bearer token and `JSESSIONID` cookie for authenticated requests.

## Scripts

### `backend/scripts/pull_asset_data.py`

Pulls the base Host asset dataset and writes:

- `backend/data/asset_business_context.csv`

What it pulls:

- host identifiers:
  - `id`
  - `uid`
  - `name`
  - `displayName`
  - `hostnames`
- networking:
  - `privateIpAddresses`
  - `publicIpAddresses`
- broad asset context:
  - `type`
  - `status`
  - `tags`
  - `applications`
  - `businessServices`
  - `environments`
  - `complianceStatus`

How it works:

- Runs a BQL Host query against Brinqa.
- Paginates with `limit` and `skip`.
- Flattens lists and nested objects into CSV-safe strings.
- Saves a simple asset-level CSV used as the base dataset.

Run:

```bash
python3 backend/scripts/pull_asset_data.py
```

### `backend/scripts/pull_qualys_vm_host_data.py`

Pulls lean Qualys enrichment data for one Host asset id and writes:

- `backend/data/qualys_vm_host_lookup_and_detail.csv`

What it pulls:

- lookup keys:
  - `qualys_vm_host_id`
  - `qualys_vm_host_uid`
  - `qualys_vm_host_link`
  - `qualys_vm_host_integration`
- selected Qualys detail fields not already covered by the base asset dataset:
  - `dnsname`
  - `hostnameIdentifier`
  - `trackingmethod`
  - `uuid`
  - `macAddressesIdentifier`
  - `lastauthenticatedscan`
  - `lastscanned`

How it works:

1. Uses the Host `asset_id`.
2. Calls Brinqa related-source lookup to find the related `QualysVmHost`.
3. Extracts the related Qualys id.
4. Calls the Qualys VM Host model endpoint with that id.
5. Writes a single lean CSV row keyed by `asset_id`.

Run:

```bash
python3 backend/scripts/pull_qualys_vm_host_data.py --asset-id <HOST_ASSET_ID>
```

### `backend/scripts/pull_servicenow_host_data.py`

Pulls lean ServiceNow enrichment data for one Host asset id and writes:

- `backend/data/servicenow_host_lookup_and_detail.csv`

What it pulls:

- lookup keys:
  - `servicenow_host_id`
  - `servicenow_host_uid`
  - `servicenow_host_link`
  - `servicenow_host_integration`
- selected ServiceNow detail fields that add ownership, business, and criticality context:
  - `application`
  - `businessservice`
  - `category`
  - `complianceflags`
  - `devicetype`
  - `division`
  - `itSme`
  - `itdirector`
  - `internalorexternal`
  - `location`
  - `owner`
  - `pci`
  - `pii`
  - `serviceteam`
  - `uuid`
  - `virtualorphysical`

How it works:

1. Uses the Host `asset_id`.
2. Calls Brinqa related-source lookup to find the related `ServicenowHost`.
3. Extracts the related ServiceNow id.
4. Calls the ServiceNow Host model endpoint with that id.
5. Writes a single lean CSV row keyed by `asset_id`.

Run:

```bash
python3 backend/scripts/pull_servicenow_host_data.py --asset-id <HOST_ASSET_ID>
```

### `backend/scripts/pull_asset_source_data.py`

This is the simplest single-asset enrichment entrypoint. It writes:

- `backend/data/qualys_vm_host_lookup_and_detail.csv`
- `backend/data/servicenow_host_lookup_and_detail.csv`
- `backend/data/asset_source_lookup_and_detail.csv`

What it does:

- Pulls Qualys enrichment for one asset.
- Pulls ServiceNow enrichment for the same asset.
- Writes each source-specific CSV separately.
- Writes a combined CSV row keyed by `asset_id`.

Run:

```bash
python3 backend/scripts/pull_asset_source_data.py --asset-id <HOST_ASSET_ID>
```

## Shared Helper

### `backend/scripts/brinqa_source_helpers.py`

This helper centralizes the repeated Brinqa script behavior:

- auth header construction
- session creation
- related-source lookup request building
- flattening and normalizing response values
- CSV writing

It keeps the Qualys and ServiceNow scripts aligned in structure and behavior.

## How The Scripts Fit Together

### Base asset workflow

- Run `pull_asset_data.py` to get the main asset dataset.
- Use the resulting Host `id` as the asset id for source lookups.

### Single-asset source workflow

- Run `pull_asset_source_data.py --asset-id <HOST_ASSET_ID>`.
- That script calls the Qualys and ServiceNow source scripts internally.
- Each source script resolves the related source record first, then pulls its detail payload.

## Why The Source Data Is Lean

The source CSVs do not try to mirror full Brinqa source model records.

They are intentionally limited to:

- the source lookup id and link needed for future on-demand fetches
- source-specific identifiers
- source-specific business or technical context that is useful for scoring

This avoids storing duplicate copies of fields already present in `asset_business_context.csv`, such as broad host naming, IPs, tags, and generic status fields.

## Current Outputs

- `backend/data/asset_business_context.csv`
  - main host asset dataset
- `backend/data/qualys_vm_host_lookup_and_detail.csv`
  - lean Qualys source data for a tested asset
- `backend/data/servicenow_host_lookup_and_detail.csv`
  - lean ServiceNow source data for a tested asset
- `backend/data/asset_source_lookup_and_detail.csv`
  - combined single-asset view of both source enrichments

## Notes

- These scripts are currently optimized for testing and inspection.
- The combined source workflow currently targets one asset id at a time.
- A later step can merge selected enrichment columns back into the base asset dataset by `asset_id`.
