# Legacy EPSS Enrichment

This documents the pre-refactor EPSS enrichment feature before it was deferred from active runtime use.

## What It Did

- downloaded EPSS score data
- stored EPSS values locally
- used EPSS values during finding enrichment and internal rescoring

## Where It Lived

- `backend/app/epss.py`
- `backend/app/seed.py`

## Runtime Dependencies

- `epss_scores`
- `scored_findings`

## Inputs And Outputs

- Input: CVE ids on finding rows
- Output: `epss_score` and `epss_percentile` values on findings

## Core Rules

- only findings with CVE ids were enrichable
- refresh logic repopulated the local EPSS cache

## External Dependencies

- EPSS dataset download

## Reimplementation Requirements

- decide whether EPSS should be fetched live, cached in Supabase, or precomputed in an offline job
- restore the CVE-to-EPSS mapping pass if score display remains a product requirement
