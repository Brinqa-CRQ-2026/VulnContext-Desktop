# CRQ Business Service Scoring V4

Business-service CRQ v4 rolls persisted application and direct-asset CRQ scores into `public.business_services`. The same scoring entrypoint also updates business-unit rollups in `public.business_units`.

The scorer keeps business-service risk and priority signals on a `0-10` scale:

- `crq_business_service_aggregated_application_risk`
- `crq_business_service_aggregated_direct_asset_risk`
- `crq_business_service_risk_score`
- `crq_business_service_priority_score`

Business criticality is parsed from `criticality_label` into:

- `business_criticality_score`

Counts are persisted separately as raw counts:

- `crq_business_service_application_count`
- `crq_business_service_asset_count`
- `crq_business_service_finding_count`

## Aggregated Application Risk

Application rollup is a weighted average of persisted application risk scores:

`application_weight = log(1 + application_asset_count) + log(1 + application_finding_count)`

`crq_business_service_aggregated_application_risk = sum(application_risk_score * application_weight) / sum(application_weight)`

Missing application risk scores are excluded. If scored applications exist but all weights are zero, the aggregate is `0.0`.

## Aggregated Direct Asset Risk

Direct asset rollup is a weighted average of persisted direct asset risk scores:

`direct_asset_weight = log(1 + direct_asset_finding_count)`

`crq_business_service_aggregated_direct_asset_risk = sum(direct_asset_risk_score * direct_asset_weight) / sum(direct_asset_weight)`

Missing direct asset risk scores are excluded. If scored direct assets exist but all weights are zero, the aggregate is `0.0`.

## Final Business-Service Risk

If only application risk or only direct-asset risk exists, `crq_business_service_risk_score` uses that available aggregate directly.

If both exist:

`crq_business_service_risk_score = (0.80 * crq_business_service_aggregated_application_risk) + (0.20 * crq_business_service_aggregated_direct_asset_risk)`

The result is clamped to `0-10` and rounded to two decimals.

## Business-Service Priority

If `business_criticality_score` is present:

`normalized_business_criticality = (business_criticality_score / 5) * 10`

`crq_business_service_priority_score = (0.70 * crq_business_service_risk_score) + (0.30 * normalized_business_criticality)`

If `business_criticality_score` is missing, priority falls back to `crq_business_service_risk_score`.

## Business-Unit Rollup

The business-service scoring entrypoint also updates affected business units:

`crq_business_unit_risk_score = average(crq_business_service_risk_score)`

`crq_business_unit_priority_score = average(crq_business_service_priority_score)`

The rollup also persists summed counts:

- `crq_business_unit_business_service_count`
- `crq_business_unit_application_count`
- `crq_business_unit_asset_count`
- `crq_business_unit_finding_count`
