# Scoring Model (CVSS + EPSS + KEV + Asset Context)

## Overview

VulnContext computes a local-first risk score for each finding and then maps the score into a risk band. The model combines:

- CVSS base score
- EPSS (stored in this project as a normalized 0-1 signal)
- Asset criticality
- Exposure (internet-facing bonus)
- Vulnerability age
- Authentication-required penalty
- CISA KEV (Known Exploited Vulnerabilities) override/boost

## Normalization

- `cvss_norm = cvss_score / 10.0`
- `epss_norm = clamp(epss_score, 0, 1)`
- `crit_norm = asset_criticality / 4.0` (this app currently uses 1-4 criticality)
- `age_norm = min(vuln_age_days, 365) / 365.0`

## Base Score

The base score uses the existing weighted structure (weights remain configurable):

- CVSS weight
- EPSS weight
- Internet exposure weight
- Asset criticality weight
- Vulnerability age weight
- Auth-required penalty (negative)

The weighted result is clamped to `[0,1]`, then converted to a UI score in `0-100`.

## KEV Override / Boost

If a finding’s `cve_id` is in the CISA KEV catalog:

- `risk_raw = min(1.0, base_score + 0.25)`
- `risk_band = Critical` (minimum)
- `slaHours` is assigned:
  - `24` hours if `asset_criticality >= 4`
  - `72` hours otherwise

This is intended to float known-exploited items to the top and support urgent remediation workflows.

## EPSS Threshold Floors (non-KEV only)

For non-KEV findings, the normal score-to-band mapping is kept, but EPSS floors are applied:

- `epss_norm >= 0.95` -> at least `High`
- `epss_norm >= 0.80` and `< 0.95` -> at least `Medium`

This keeps highly likely-to-be-exploited findings from being buried by a low base score.

## `slaHours`

`slaHours` is a recommended remediation SLA produced only for KEV findings right now.

- It is derived from KEV status + asset criticality.
- It is returned via API and displayed in the finding detail page.
