# Legacy Asset Graph And Normalized Model

This documents the pre-refactor local asset graph and normalized app/service model before it was deferred.

## What It Did

- upserted asset rows during CSV import
- linked findings to local asset records
- supported normalized application and business-service relationships

## Where It Lived

- `backend/app/services/asset_graph.py`
- `backend/app/models.py`

## Runtime Dependencies

- `assets`
- `asset_applications`
- `applications`
- `application_business_services`
- `business_services`
- `scored_findings`

## Inputs And Outputs

- Input: parsed staged finding rows with asset context fields
- Output: local asset graph rows plus finding-to-asset linkage

## Core Rules

- asset lookup used external asset ids from parsed rows
- asset context fields were filled opportunistically from staged data
- findings inherited asset criticality and compliance status when missing

## External Dependencies

- staged CSV source data

## Reimplementation Requirements

- decide whether normalized applications and business services are still needed in the Supabase-first design
- if needed, add them intentionally as Supabase tables instead of reviving the old local-only graph implicitly
