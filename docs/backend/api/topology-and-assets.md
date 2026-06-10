# Backend Topology And Asset API

## Summary

These routes power the topology drill-down experience and the asset browsing surface. They include business-unit hierarchy pages, asset lists, asset analytics, persisted asset detail, FAIR loss prediction, and asset findings drill-down.

## Important Preconditions

- business-unit topology routes require the normalized topology tables from `docs/backend/topology-seed/topology-expansion.sql`
- `GET /assets?business_unit=...` also requires that normalized topology schema
- `business_service` and `application` filters can still fall back to legacy text fields when the normalized joins are not available

## Route Table

| Route | Purpose | Notes |
| --- | --- | --- |
| `GET /topology/business-units` | Lists business units with aggregate metrics | returns `503` until topology tables exist |
| `GET /topology/business-units/{business_unit_slug}` | Returns one business-unit detail page | returns `503` until topology tables exist |
| `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}` | Returns one business-service detail page | returns `503` until topology tables exist |
| `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/analytics` | Returns business-service analytics | returns `503` until topology tables exist |
| `POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/fair-loss` | Predicts FAIR loss for one business service | returns `503` until topology tables exist |
| `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}` | Returns one application detail page | returns `503` until topology tables exist |
| `POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}/fair-loss` | Predicts FAIR loss for one application | returns `503` until topology tables exist |
| `GET /assets` | Lists assets with filters, sorting, and pagination | supports legacy and normalized topology filters |
| `GET /assets/analytics` | Returns filtered asset analytics | uses the same non-pagination filters as `/assets` |
| `GET /assets/{asset_id}` | Returns persisted asset detail only | no Brinqa call |
| `POST /assets/{asset_id}/fair-loss` | Predicts FAIR loss for one asset | uses persisted asset/finding context |
| `GET /assets/{asset_id}/findings` | Returns findings attached to one asset | supports finding-level filters and sort order |
| `GET /assets/{asset_id}/findings/analytics` | Returns analytics for the full filtered finding set | ignores pagination and returns aggregate metrics |

## Topology Routes

### `GET /topology/business-units`

Inputs:

- no query parameters

Outputs:

- `BusinessUnitSummary[]`
- company metadata, business-unit descriptions, aggregate counts, risk score, risk band, and priority score

- returns a list of business units ordered by name
- includes company data, business-unit description, and aggregate counts for services, assets, and findings
- includes persisted `risk_score`, derived `risk_band`, persisted `priority_score`, and `risk_trend = null`
- returns `503` when the normalized topology tables are missing

### `GET /topology/business-units/{business_unit_slug}`

Inputs:

- `business_unit_slug` path parameter

Outputs:

- `BusinessUnitDetail`
- business-unit metadata, child business services, metrics, risk score, priority score, and risk band

- returns one business unit with metadata and child business-service summaries
- includes per-child metrics for applications, assets, and findings
- includes business-unit `risk_score`, derived `risk_band`, and `priority_score`
- child business services include risk, priority, and parsed business criticality when present
- returns `404` when the slug does not resolve

### `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}`

Inputs:

- `business_unit_slug` path parameter
- `business_service_slug` path parameter

Outputs:

- `BusinessServiceDetail`
- service metadata, applications, direct assets, metrics, risk/priority context, and scoring timestamps

- returns one business service with its applications and direct assets
- direct assets are assets attached to the service without an application
- includes service risk, priority, parsed criticality, aggregated application risk, aggregated direct asset risk, and scoring timestamp when present
- returns `404` when the slug pair does not resolve

### `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/analytics`

Inputs:

- `business_unit_slug` path parameter
- `business_service_slug` path parameter

Outputs:

- service totals, asset criticality distribution, asset type distribution, service risk score, service risk label, service priority score, and business criticality context

- returns service-level totals
- returns asset criticality distribution from persisted asset context scores
- returns the top asset-type buckets for the service
- returns `service_risk_score`, derived `service_risk_label`, `service_priority_score`, and business criticality context when present

### `POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/fair-loss`

Inputs:

- business-unit and business-service slugs
- FAIR request body with control context, iterations, and business-service loss magnitude assumptions

Outputs:

- `FairLossPredictionResponse` with annualized loss, percentile loss, TEF, LEF, vulnerability, control score, histogram, and magnitude details

- predicts FAIR loss for the selected business service
- aggregates ranked findings across assets in scope
- returns an empty prediction when the scope has no eligible findings
- returns `404` when the business service does not resolve

### `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}`

Inputs:

- business-unit, business-service, and application slugs

Outputs:

- `ApplicationDetail`
- application metadata, metrics, child assets, aggregated asset risk, compliance score, application risk score, and scoring timestamp

- returns one application with its child assets
- includes aggregate finding counts for the application and its assets
- includes aggregated asset risk, compliance score, application risk score, and scoring timestamp when present
- returns `404` when the slug trio does not resolve

### `POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}/fair-loss`

Inputs:

- business-unit, business-service, and application slugs
- FAIR request body with control context and iterations

Outputs:

- `FairLossPredictionResponse` with event-frequency fields for the application scope

- predicts FAIR loss for the selected application
- uses normalized asset foreign keys when topology links have been backfilled
- returns an empty prediction when the application scope has no eligible findings
- returns `404` when the slug trio does not resolve

## Asset Routes

### `GET /assets`

Inputs:

- `page` default `1`
- `page_size` default `50`, valid range `1-200`
- `business_unit` optional
- `business_service` optional
- `application` optional
- `status` optional
- `environment` optional
- `compliance` optional
- `search` optional
- `direct_only` default `false`
- `sort_by` default `name`
- `sort_order` default `asc`

Filter behavior:

- `business_unit` matches the normalized business-unit name and requires the topology schema
- `business_service` and `application` can use normalized joins when available, or legacy text fields otherwise
- `environment=unknown` matches null or empty values
- `compliance=pci` matches `pci = true`
- `compliance=pii` matches `pii = true`
- `compliance=regulated` matches PCI, PII, or non-null compliance flags
- `search` matches `asset_id`, `hostname`, `device_type`, `category`, and `environment`
- `direct_only=true` keeps only assets without an application assignment

Sorting supports:

- `name`
- `asset_type`
- `asset_criticality`
- `status`
- `finding_count`

Outputs:

- `PaginatedAssets`
- `items`: page of `AssetSummary` rows
- `total`, `page`, and `page_size`

Behavior notes:

- sorting is applied in Python after the filtered asset set is loaded
- invalid `sort_by` values return `400`
- `sort_order` is not validated; anything other than `desc` behaves like ascending order
- `GET /assets?business_unit=...` returns `503` when topology tables are not present

### `GET /assets/analytics`

Inputs:

- same filters as `/assets`, excluding pagination and sorting

Outputs:

- `AssetAnalyticsResponse`
- total asset count, asset criticality distribution, and finding risk distribution

- uses the same filters as `/assets`, but not pagination or sorting
- returns total asset count
- returns asset criticality distribution from `crq_asset_context_score`
- returns finding risk distribution from `crq_asset_aggregated_finding_risk`

## Asset Detail Routes

### `GET /assets/{asset_id}`

Inputs:

- `asset_id` path parameter

Outputs:

- `AssetDetail`
- persisted asset metadata, normalized topology labels when available, status/environment/category/compliance fields, and risk context

- returns the persisted asset row only
- adds normalized topology labels when available
- does not call Brinqa enrichment
- returns `404` when the asset does not exist

### `POST /assets/{asset_id}/fair-loss`

Inputs:

- `asset_id` path parameter
- FAIR request body with control context and iterations

Outputs:

- `FairLossPredictionResponse` with event-frequency fields for the asset scope

- predicts FAIR loss for the selected asset
- uses persisted asset metadata and related findings
- returns an empty prediction when the asset has no eligible findings
- returns `404` when the asset does not exist

### `GET /assets/{asset_id}/findings`

Inputs:

- `page` default `1`
- `page_size` default `20`, valid range `1-200`
- `sort_by` default `risk_score`
- `sort_order` default `desc`
- `risk_band` optional
- `kev_only` default `false`
- `source` optional
- `search` optional

Outputs:

- `AssetFindingsPage`
- selected asset summary plus paginated `FindingSummary` rows

Behavior notes:

- `source` behaves like the findings list route: any non-empty value other than `Brinqa` returns an empty result set
- `risk_band` must be `Critical`, `High`, `Medium`, or `Low`
- `kev_only=true` keeps only KEV findings
- `search` matches finding name, CVE, and finding ID
- the route returns findings ordered by the same display-score rules as the main findings list

### `GET /assets/{asset_id}/findings/analytics`

Inputs:

- same finding filters as `/assets/{asset_id}/findings`, excluding pagination

Outputs:

- asset finding totals, KEV count, critical/high counts, highest risk band, average and max risk score, oldest priority age, and risk-band counts

- summarizes the full filtered finding set for the asset
- returns total findings, KEV findings, critical/high findings, highest risk band, average and max risk scores, oldest priority age, and risk-band counts
- uses the same finding filters as the asset findings list route
