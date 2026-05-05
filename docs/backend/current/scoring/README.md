# Backend Scoring Overview

## Summary

The backend currently supports two persisted CRQ layers:

- finding-level scoring in `public.findings`
- asset-level scoring in `public.assets`

The API surfaces those scores directly when present, and it does not recalculate them during request handling.

## Current Outputs

### Findings

- `crq_finding_score`
- `crq_finding_risk_band`
- `crq_finding_scored_at`
- `crq_finding_score_version`
- `crq_finding_cvss_score`
- `crq_finding_epss_score`
- `crq_finding_epss_percentile`
- `crq_finding_epss_multiplier`
- `crq_finding_is_kev`
- `crq_finding_kev_bonus`
- `crq_finding_age_days`
- `crq_finding_age_bonus`
- `crq_finding_notes`

### Assets

- `crq_asset_aggregated_finding_risk`
- `crq_asset_exposure_score`
- `crq_asset_data_sensitivity_score`
- `crq_asset_environment_score`
- `crq_asset_type_score`
- `crq_asset_context_score`
- `crq_asset_scored_at`

## API Behavior

- finding summaries and detail responses prefer CRQ values when present
- asset analytics prefer the persisted asset CRQ fields
- missing CRQ fields are returned as `null` rather than being recomputed on the fly

## Detailed References

- [CRQ Finding Scoring V4](crq-finding-scoring-v4.md)
- [CRQ Asset Scoring V1](crq-asset-scoring-v1.md)

