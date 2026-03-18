# Scoring Model (Current Internal Risk)

## Overview

The current internal risk score is being narrowed to signals we can either store
directly on a finding now or enrich locally from a CVE:

- CVSS base score
- EPSS probability
- CISA KEV presence
- asset criticality
- analyst context score

Imported vendor risk values remain separate. The app-owned score should live in:

- `internal_risk_score`
- `internal_risk_band`

## Normalization

- `cvss_norm = cvss_score / 10.0`
- `epss_norm = clamp(epss_score, 0, 1)`
- `kev_norm = 1.0 if is_kev else 0.0`
- `crit_norm = asset_criticality / 4.0` when numeric, otherwise label mapping
- `context_norm = context_score` if already `0-1`, otherwise `context_score / 100`

## Base Score

The weighted score uses:

- `cvss_weight`
- `epss_weight`
- `kev_weight`
- `asset_criticality_weight`
- `context_weight`

The weighted result is clamped to `[0,1]`, then converted to a UI score in `0-100`.

## Current Defaults

- `cvss_weight = 0.40`
- `epss_weight = 0.25`
- `kev_weight = 0.25`
- `asset_criticality_weight = 0.15`
- `context_weight = 0.20`

These defaults intentionally allow the sum to exceed `1.0` because multiple
strong signals should be able to saturate the score at `100`.

## Current Gaps

- the staged finding CSV does not currently include CVSS fields
- the staged finding CSV does not currently include EPSS fields
- the app still needs an enrichment pass to populate `epss_score` from `epss_scores`
- the app still needs a CVSS/NVD enrichment path or an upstream source feed
- route responses still expose transitional vendor `risk_score` / `risk_band` fields
