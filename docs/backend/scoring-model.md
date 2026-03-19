# Scoring Model

## Overview

The current internal risk score is based on signals the app can store directly or enrich locally:

- CVSS base score
- EPSS probability
- CISA KEV presence
- asset criticality
- analyst context score

Imported vendor risk values remain separate from the app-owned internal score.

## Output fields

- `internal_risk_score`
- `internal_risk_band`

## Inputs and normalization

- `cvss_score` is normalized to `0-1`
- `epss_score` is clamped to `0-1`
- `is_kev` becomes a KEV signal
- `asset_criticality` uses numeric or label mapping
- `context_score` supports either `0-1` or percentage-like values

## Current defaults

- `cvss_weight = 0.40`
- `epss_weight = 0.25`
- `kev_weight = 0.25`
- `asset_criticality_weight = 0.15`
- `context_weight = 0.20`

## Notes

- The score is clamped into `0-100`.
- KEV can push the result to at least `High`.
- Vendor `risk_score` and `risk_band` are still exposed separately for comparison.
