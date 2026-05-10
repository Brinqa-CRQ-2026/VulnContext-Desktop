# Backend Scoring Overview

## Summary

The backend currently supports four persisted CRQ layers:

- finding-level scoring in `public.findings`
- asset-level scoring in `public.assets`
- application-level scoring in `public.applications`
- business-service-level scoring in `public.business_services`

The API surfaces those scores directly when present, and it does not recalculate them during request handling.

## Scale Convention

Product-facing CRQ risk and rollup scores are stored on a `0-10` scale. This includes finding scores, asset rollups, asset context and risk, application rollups, application compliance, and application risk.

Atomic modifiers stay on a `0-1` scale when they represent probabilities or normalized factors. This includes asset exposure, data sensitivity, environment, asset type components, EPSS score, and EPSS percentile.

Finding EPSS and KEV adjustments are point adjustments into the `0-10` finding score, not standalone `0-1` risk scores.

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
- `crq_asset_risk_score`
- `crq_asset_scored_at`

### Applications

- `crq_application_aggregated_asset_risk`
- `crq_application_compliance_score`
- `crq_application_risk_score`
- `crq_application_asset_count`
- `crq_application_finding_count`
- `crq_application_scored_at`

### Business Services

- `crq_business_service_aggregated_application_risk`
- `crq_business_service_aggregated_direct_asset_risk`
- `crq_business_service_risk_score`
- `crq_business_service_application_count`
- `crq_business_service_asset_count`
- `crq_business_service_finding_count`
- `crq_business_service_scored_at`

## API Behavior

- finding summaries and detail responses prefer CRQ values when present
- asset analytics prefer the persisted asset CRQ fields
- missing CRQ fields are returned as `null` rather than being recomputed on the fly

## Detailed References

- [CRQ Finding Scoring V4](crq-finding-scoring-v4.md)
- [CRQ Asset Scoring V5](crq-asset-scoring-v2.md)
- [CRQ Application Scoring V4](crq-application-scoring-v1.md)
- [CRQ Business Service Scoring V4](crq-business-service-scoring-v2.md)
