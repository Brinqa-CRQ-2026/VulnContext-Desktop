# Backend Scoring Overview

## Summary

The backend currently supports five persisted CRQ layers or rollups:

- finding-level scoring in `public.findings`
- asset-level scoring in `public.assets`
- application-level scoring in `public.applications`
- business-service-level scoring in `public.business_services`
- business-unit rollups in `public.business_units`

The API surfaces those scores directly when present, and it does not recalculate them during request handling.

For the full business and formula explanation, use the canonical reference:

- [CRQ Scoring And Rollups](../../scoring/crq-scoring-and-rollups.md)

## Scale Convention

Product-facing CRQ risk, priority, and rollup scores are stored on a `0-10` scale. This includes finding scores, asset rollups, asset context and risk, application rollups, application compliance and risk, business service risk and priority, and business unit risk and priority.

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

- `business_criticality_score`
- `crq_business_service_aggregated_application_risk`
- `crq_business_service_aggregated_direct_asset_risk`
- `crq_business_service_risk_score`
- `crq_business_service_priority_score`
- `crq_business_service_application_count`
- `crq_business_service_asset_count`
- `crq_business_service_finding_count`
- `crq_business_service_scored_at`

### Business Units

- `crq_business_unit_risk_score`
- `crq_business_unit_priority_score`
- `crq_business_unit_business_service_count`
- `crq_business_unit_application_count`
- `crq_business_unit_asset_count`
- `crq_business_unit_finding_count`

## API Behavior

- finding summaries and detail responses prefer CRQ values when present
- asset analytics prefer the persisted asset CRQ fields
- topology routes surface persisted business service and business unit risk/priority fields when present
- missing CRQ fields are returned as `null` rather than being recomputed on the fly

## Detailed References

- [Finding Risk Scoring](finding-risk-scoring.md)
- [Asset Risk Scoring](asset-risk-scoring.md)
- [Application Risk Scoring](application-risk-scoring.md)
- [Business Service Scoring](business-service-scoring.md)

## Implementation Modules

CRQ scoring code lives under `backend/app/services/scoring/`:

- `crq_finding.py`
- `crq_asset.py`
- `crq_application.py`
- `crq_business_service.py`
- `crq_rollup.py`

Manual scoring scripts in `backend/scripts/manual/` call these modules. API
routes surface persisted CRQ fields and do not run scoring jobs during request
handling.
