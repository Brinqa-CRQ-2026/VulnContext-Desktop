# Legacy Source Management

This documents the pre-refactor source-management behavior before mutating source routes were deferred.

## What It Did

- Exposed source summary counts through `GET /sources`
- Renamed a stored source through `PATCH /sources/{source_name}`
- Deleted all findings for a source through `DELETE /sources/{source_name}`

## Where It Lived

- `backend/app/api/sources.py`

## Runtime Dependencies

- `scored_findings`
- `source`
- `internal_risk_band`
- `risk_band`
- `risk_rating`

## Inputs And Outputs

- Input: source name and optionally a replacement source label
- Output: grouped source summary or mutation result counts

## Core Rules

- rename required a non-empty new source
- delete removed all stored findings for a matching source
- grouping used the display band order `internal_risk_band`, then `risk_band`, then `risk_rating`

## External Dependencies

- none

## Reimplementation Requirements

- restore a stored `source` field in the primary findings table
- decide whether source mutation is still valid in a Supabase-first model
- restore grouped source-summary logic and mutation semantics
