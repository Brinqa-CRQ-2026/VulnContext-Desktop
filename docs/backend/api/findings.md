# Backend Findings API

## Summary

These routes power finding lists, summaries, persisted detail, and finding-scoped FAIR loss prediction. Finding detail is persisted-data-only and does not call live Brinqa enrichment.

## Route Table

| Route | Purpose | Output |
| --- | --- | --- |
| `GET /findings/top` | Returns the 10 highest-ranked findings by priority score | `FindingSummary[]` |
| `GET /findings/summary` | Returns overall risk-band totals and KEV totals | `ScoresSummary` |
| `GET /findings` | Returns paginated findings with filters and sorting | `PaginatedFindings` |
| `GET /findings/{finding_id}` | Returns persisted finding detail only | `FindingDetail` |
| `POST /findings/{finding_id}/fair-loss` | Predicts FAIR loss for one finding | `FairLossPredictionResponse` |

## Shared Behavior

- the display score prefers `crq_finding_score` and falls back to `brinqa_risk_score`
- the priority score uses `crq_finding_priority_score` and falls back to display score for sorting when priority is missing
- `FindingSummary.source` is always `Brinqa`
- the main detail route does not call external enrichment services
- live Brinqa enrichment fetches are legacy code outside the active API surface

## `GET /findings/top`

Inputs:

- no query parameters

Outputs:

- up to 10 `FindingSummary` rows
- ranking uses priority score when available
- each row includes identity, CVE/title, display risk score, priority score, band, source, status, asset/business context, and KEV flags when present

Behavior notes:

- returns the top 10 findings by the current priority-score expression
- useful for home screens and quick triage views

## `GET /findings/summary`

Inputs:

- no query parameters

Outputs:

- total finding count
- risk-band counts
- KEV total and KEV risk-band counts
- average risk score when scored findings exist

Behavior notes:

- returns total finding count
- returns risk-band totals for `Critical`, `High`, `Medium`, and `Low`
- returns KEV totals overall and by band

## `GET /findings`

Inputs:

- `page` default `1`
- `page_size` default `50`, valid range `1-200`
- `sort_by` default `risk_score`
- `sort_order` default `desc`
- `source` optional
- `risk_band` optional
- `search` optional

Sorting supports:

- `risk_score`
- `priority_score`
- `internal_risk_score`
- `source_risk_score`
- `cvss_score`
- `epss_score`
- `age_in_days`
- `vuln_age_days`
- `due_date`
- `source`
- `risk_band`
- `status`

Outputs:

- `items`: page of `FindingSummary` rows
- `total`: filtered total count
- `page`: current page
- `page_size`: page size used

Behavior notes:

- any non-empty `source` value other than `Brinqa` returns an empty result set
- `risk_band` must be one of `Critical`, `High`, `Medium`, or `Low`
- invalid `sort_by` or `sort_order` values return `400`
- the route returns an empty page when the filtered count is zero

## `GET /findings/{finding_id}`

Inputs:

- `finding_id` path parameter

Outputs:

- one `FindingDetail` row with persisted vulnerability, scoring, KEV, remediation, asset, and business context fields

Behavior notes:

- returns a single persisted finding row
- joins asset context for summary shaping, but does not call external enrichment services
- returns `404` when the finding does not exist

## `POST /findings/{finding_id}/fair-loss`

Inputs:

- `finding_id` path parameter
- FAIR request body with control context, iteration count, and optional loss magnitude fields

Outputs:

- `FairLossPredictionResponse`
- frequency fields such as TEF, LEF, vulnerability, and control score
- loss fields when the scope supports monetary loss modeling

Behavior notes:

- predicts FAIR loss for the selected finding
- uses persisted finding and asset context as the model input
- returns `404` when the finding does not exist
- accepts request body controls such as iteration count and loss magnitude inputs through the FAIR schema
