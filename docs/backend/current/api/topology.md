# Backend Topology And Asset API

## Summary

These routes power the topology drill-down experience and the asset browsing surface. They include business-unit hierarchy pages, asset lists, asset analytics, asset detail, asset enrichment, and asset findings drill-down.

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
| `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}` | Returns one application detail page | returns `503` until topology tables exist |
| `GET /assets` | Lists assets with filters, sorting, and pagination | supports legacy and normalized topology filters |
| `GET /assets/analytics` | Returns filtered asset analytics | uses the same non-pagination filters as `/assets` |
| `GET /assets/{asset_id}` | Returns persisted asset detail only | no Brinqa call |
| `GET /assets/{asset_id}/enrichment` | Returns request-scoped Brinqa enrichment | reads auth from request headers |
| `GET /assets/{asset_id}/findings` | Returns findings attached to one asset | supports finding-level filters and sort order |
| `GET /assets/{asset_id}/findings/analytics` | Returns analytics for the full filtered finding set | ignores pagination and returns aggregate metrics |

## Topology Routes

### `GET /topology/business-units`

- returns a list of business units ordered by name
- includes company data and aggregate counts for services, assets, and findings
- returns `503` when the normalized topology tables are missing

### `GET /topology/business-units/{business_unit_slug}`

- returns one business unit with metadata and child business-service summaries
- includes per-child metrics for applications, assets, and findings
- returns `404` when the slug does not resolve

### `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}`

- returns one business service with its applications and direct assets
- direct assets are assets attached to the service without an application
- returns `404` when the slug pair does not resolve

### `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/analytics`

- returns service-level totals
- returns asset criticality distribution from persisted asset context scores
- returns the top asset-type buckets for the service
- `service_risk_score` and `service_risk_label` are currently unset

### `GET /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}`

- returns one application with its child assets
- includes aggregate finding counts for the application and its assets
- returns `404` when the slug trio does not resolve

## Asset Routes

### `GET /assets`

Supported query parameters:

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

Behavior notes:

- sorting is applied in Python after the filtered asset set is loaded
- invalid `sort_by` values return `400`
- `sort_order` is not validated; anything other than `desc` behaves like ascending order
- `GET /assets?business_unit=...` returns `503` when topology tables are not present

### `GET /assets/analytics`

- uses the same filters as `/assets`, but not pagination or sorting
- returns total asset count
- returns asset criticality distribution from `crq_asset_context_score`
- returns finding risk distribution from `crq_asset_aggregated_finding_risk`

## Asset Detail Routes

### `GET /assets/{asset_id}`

- returns the persisted asset row only
- adds normalized topology labels when available
- does not call Brinqa enrichment
- returns `404` when the asset does not exist

### `GET /assets/{asset_id}/enrichment`

- returns request-scoped Brinqa enrichment for the asset
- requires `X-Brinqa-Auth-Token`
- accepts optional `X-Brinqa-Session-Cookie`
- returns a structured status and reason instead of throwing away upstream failure detail

Known status values:

- `missing_token`
- `unauthorized_token`
- `no_related_source`
- `partial_success`
- `success`
- `upstream_error`

The response also includes:

- `detail_source`
- `detail_fetched_at`
- asset metadata fields when available

### `GET /assets/{asset_id}/findings`

Supported query parameters:

- `page` default `1`
- `page_size` default `20`, valid range `1-200`
- `sort_by` default `risk_score`
- `sort_order` default `desc`
- `risk_band` optional
- `kev_only` default `false`
- `source` optional
- `search` optional

Behavior notes:

- `source` behaves like the findings list route: any non-empty value other than `Brinqa` returns an empty result set
- `risk_band` must be `Critical`, `High`, `Medium`, or `Low`
- `kev_only=true` keeps only KEV findings
- `search` matches finding name, CVE, and finding ID
- the route returns findings ordered by the same display-score rules as the main findings list

### `GET /assets/{asset_id}/findings/analytics`

- summarizes the full filtered finding set for the asset
- returns total findings, KEV findings, critical/high findings, highest risk band, average and max risk scores, oldest priority age, and risk-band counts
- uses the same finding filters as the asset findings list route

