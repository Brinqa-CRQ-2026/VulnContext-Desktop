# Frontend Page Architecture

## Summary

This page maps the main renderer pages to their purpose, data sources, and UI responsibilities. The app shell in `frontend/src/app.tsx` owns the active route, top page header, breadcrumbs/back behavior, and refresh token propagation.

## Company

- Component: `BusinessServicesOverview`
- Purpose: company-level topology landing page.
- Shows: business units, counts, risk context, and drill-down entry points.
- Data: `getBusinessUnits()` through `useBusinessUnits`.
- Backend doc: [Topology And Assets](../../backend/api/topology-and-assets.md).

## Business Unit

- Component: `BusinessUnitDetailPage`
- Purpose: scoped business-unit risk view.
- Shows: business-unit metrics, risk overview, business services, and scoped findings.
- Data: business-unit detail, risk overview, and business-unit findings hooks.
- Notes: findings table uses the shared findings/data-table path and keeps filtering/sorting state in the page.

## Business Service

- Component: `BusinessServiceDetailPage`
- Purpose: service-level risk and loss exposure view.
- Shows: service metrics, applications, direct assets, service analytics charts, and FAIR loss exposure.
- Data: business-service detail, analytics, assets, and FAIR loss prediction.
- Notes: direct assets are assets attached to the business service without an application.

## Application

- Component: `ApplicationDetailPage`
- Purpose: application-level asset and FAIR frequency view.
- Shows: application metrics, FAIR event frequency, and attached assets.
- Data: application detail, paginated assets, and application FAIR prediction.

## Asset

- Component: `AssetFindingsPage`
- Purpose: asset-level risk and findings drill-down.
- Shows: asset metrics, finding risk spread, FAIR event frequency, and asset findings table.
- Data: asset findings, asset findings analytics, asset detail, and asset FAIR prediction.
- Notes: asset classification metadata is not shown in the hero; status is the only hero badge.

## Finding

- Component: `FindingDetailPage`
- Purpose: persisted finding detail and remediation context.
- Shows: score metrics, vulnerability overview, FAIR event frequency, CVSS/KEV/supporting details, and affected asset/business context.
- Data: `getFindingDetails()` and finding FAIR prediction.
- Backend doc: [Findings API](../../backend/api/findings.md).

## Sources

- Component: `IntegrationsPage`
- Purpose: read-only source totals.
- Shows: persisted source counts and runtime note.
- Data: `getSourcesSummary()`.
- Backend doc: [Sources API](../../backend/api/sources.md).

## Security Score

- Component: `SecurityScorePage`
- Purpose: control assessment and security-score context.
- Shows: current control answers, calculated scores, and save/reset actions.
- Data: controls API module.
- Backend doc: [FAIR Frontend Backend Contract](../../backend/fair/frontend-backend-contract.md).

## Navigation Rules

- Topology pages use layer names in the top header: Company, Business Unit, Business Service, Application, Asset.
- Topology back buttons live in the top `PageIntro`, not in second-level detail headers.
- Entity detail cards should render entity names and descriptive context, not duplicate route-level navigation.
