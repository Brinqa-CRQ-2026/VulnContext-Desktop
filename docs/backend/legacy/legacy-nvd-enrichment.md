# Legacy NVD Enrichment

This documents the pre-refactor NVD enrichment feature before it was deferred from active runtime use.

## What It Did

- loaded cached NVD CVE data
- enriched findings with CVSS, CWE, description, and KEV-adjacent metadata
- supported refresh operations for persisted findings

## Where It Lived

- `backend/app/services/nvd_enrichment.py`
- `backend/scripts/sync_nvd_cache.py`

## Runtime Dependencies

- `nvd_cve_cache`
- `scored_findings`

## Inputs And Outputs

- Input: CVE ids on findings and local NVD JSON feed data
- Output: populated CVSS/CWE/description-related fields on findings

## Core Rules

- findings without CVE ids were skipped
- cache rows were keyed by CVE id
- refresh logic updated existing finding rows in place

## External Dependencies

- NVD JSON feeds

## Reimplementation Requirements

- decide whether NVD enrichment should stay offline, move to Supabase-side storage, or be performed on demand
- restore cache sync and mapping logic if CVSS/CWE display remains required
