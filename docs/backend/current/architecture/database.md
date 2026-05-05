# Backend Database Reference

## Summary

This page documents the data shape the backend reads today. The backend is built around thin persisted tables with a normalized topology layer staged above assets.

## Runtime Tables

### `public.assets`

- keyed by external `asset_id`
- there is no local integer surrogate key for assets
- stores asset context and topology foreign keys during the transition
- contains legacy text fields such as `application` and `business_service`
- contains asset CRQ outputs such as `crq_asset_aggregated_finding_risk` and `crq_asset_context_score`

### `public.findings`

- keyed by sequence-backed `id`
- attached to `asset_id`
- stores the persisted finding record plus CRQ finding outputs such as `crq_finding_score`
- the API prefers the persisted CRQ fields when they exist

## Normalized Topology Layer

The repo stages a normalized topology hierarchy above assets:

- `public.companies`
- `public.business_units`
- `public.business_services`
- `public.applications`

It also stages nullable foreign keys on `public.assets`:

- `company_id`
- `business_unit_id`
- `business_service_id`
- `application_id`

## Backend Interpretation

- finding summary and detail routes prefer CRQ finding fields when present
- asset analytics prefer persisted asset CRQ fields when present
- topology routes use the normalized tables once they exist
- legacy `assets.business_service` and `assets.application` remain in place during migration
- exact-name matching is used when backfilling topology foreign keys

