# Backend Findings API

## Summary

These routes power finding lists, summaries, persisted detail, and explicit finding enrichment. The main detail route stays persisted-data-only; enrichment is separate.

## Route Table

| Route | Purpose | Output |
| --- | --- | --- |
| `GET /findings/top` | Returns the 10 highest-ranked findings by display score | `FindingSummary[]` |
| `GET /findings/summary` | Returns overall risk-band totals and KEV totals | `ScoresSummary` |
| `GET /findings` | Returns paginated findings with filters and sorting | `PaginatedFindings` |
| `GET /findings/{finding_id}` | Returns persisted finding detail only | `FindingDetail` |
| `GET /findings/{finding_id}/enrichment` | Returns explicit narrative enrichment for one finding | `FindingEnrichment` |

## Shared Behavior

- the display score prefers `crq_finding_score` and falls back to `brinqa_risk_score`
- `FindingSummary.source` is always `Brinqa`
- the main detail route does not call external enrichment services
- the enrichment route is opt-in and can fail independently of the persisted-detail route

## `GET /findings/top`

- returns the top 10 findings by the current display-score expression
- useful for home screens and quick triage views

## `GET /findings/summary`

- returns total finding count
- returns risk-band totals for `Critical`, `High`, `Medium`, and `Low`
- returns KEV totals overall and by band

## `GET /findings`

Supported query parameters:

- `page` default `1`
- `page_size` default `50`, valid range `1-200`
- `sort_by` default `risk_score`
- `sort_order` default `desc`
- `source` optional
- `risk_band` optional

Sorting supports:

- `risk_score`
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

Behavior notes:

- any non-empty `source` value other than `Brinqa` returns an empty result set
- `risk_band` must be one of `Critical`, `High`, `Medium`, or `Low`
- invalid `sort_by` or `sort_order` values return `400`
- the route returns an empty page when the filtered count is zero

## `GET /findings/{finding_id}`

- returns a single persisted finding row
- joins asset context for summary shaping, but does not call external enrichment services
- returns `404` when the finding does not exist

## `GET /findings/{finding_id}/enrichment`

- returns the explicit narrative payload for one finding
- uses the persisted finding as the lookup key and Brinqa detail service for enrichment
- returns `404` when the finding does not exist
- `due_date` is parsed when the payload provides an ISO-like timestamp

