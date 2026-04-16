# Legacy KEV Enrichment

This documents the pre-refactor KEV enrichment feature before it was deferred from active runtime use.

## What It Did

- loaded a KEV catalog from CSV
- matched findings to KEV records by CVE
- updated finding KEV metadata and optionally rescored findings

## Where It Lived

- `backend/app/services/kev_enrichment.py`
- `backend/app/api/admin.py`

## Runtime Dependencies

- `scored_findings`
- `risk_scoring_config`

## Inputs And Outputs

- Input: KEV CSV path and finding CVE ids
- Output: KEV flags and supporting KEV metadata on findings

## Core Rules

- CVE id was the join key
- rows were marked or cleared based on presence in the current KEV catalog
- rescoring happened after KEV state changed

## External Dependencies

- CISA KEV catalog CSV

## Reimplementation Requirements

- decide whether KEV should be a stored field, a derived cached field, or a live enrichment
- restore the CVE lookup and update process if KEV badges or reporting remain required
