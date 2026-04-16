# Legacy Disposition And Event History

This documents the pre-refactor analyst triage feature before write support was deferred.

## What It Did

- Allowed setting a manual finding disposition
- Allowed clearing a disposition
- Recorded a `FindingEvent` audit row for disposition changes

## Where It Lived

- `backend/app/api/findings.py`
- `backend/app/api/common.py`
- `backend/app/models.py`

## Runtime Dependencies

- `scored_findings`
- `finding_events`

## Inputs And Outputs

- Input: disposition, optional reason, comment, expires_at, actor
- Output: persisted disposition fields and an audit event

## Core Rules

- allowed dispositions were `none`, `ignored`, `risk_accepted`, `false_positive`, `not_applicable`
- the write endpoint refused `none`; clearing used a separate endpoint
- events stored old and new JSON snapshots

## External Dependencies

- none

## Reimplementation Requirements

- decide whether disposition belongs in Supabase summary rows, a separate app-owned table, or another analyst state store
- restore audit history if analyst workflows need traceability
