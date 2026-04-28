# Business Services Feature Tracker

This file tracks the current state of the business-context expansion so future chats can continue from the latest agreed direction.

## Goal

Keep the business-context navigation layer as the primary path above findings:

- `Business Unit -> Business Service -> Application -> Assets -> Findings`

The current implementation is backend-driven, not mock-backed.

## Current Implementation State

### Routing

- frontend routing supports Business Services as the default landing path
- FastAPI serves the built frontend for:
  - `/`
  - `/business-services`
  - nested business-services drill-down paths
- Business Services uses HTTP path routing
- findings and integrations still use hash-style routing to avoid collisions with backend API routes

### Overview Page

Current overview page is a business-unit overview page.

Implemented behavior:

- page header title is `Business Unit Overview`
- the page loads business units from the backend topology route
- each row/card carries current rollup counts from persisted topology and findings data

### Drill-Down Flow

The current flow is:

- business unit overview
- business unit detail
- business service detail
- optional application detail
- asset findings page
- finding detail with breadcrumb-aware return path

## Files Added Or Changed For This Feature

- `frontend/src/components/business-services/BusinessServicesOverview.tsx`
- `frontend/src/components/business-services/BusinessUnitDetailPage.tsx`
- `frontend/src/components/business-services/BusinessServiceDetailPage.tsx`
- `frontend/src/components/business-services/ApplicationDetailPage.tsx`
- `frontend/src/components/business-services/AssetFindingsPage.tsx`
- `frontend/src/app.tsx`
- `frontend/src/components/layout/Header.tsx`
- `backend/app/main.py`
- `backend/app/api/topology.py`
- `frontend/src/tests/app.test.tsx`
- `frontend/src/tests/components/business-services/BusinessServicesOverview.test.tsx`

## Current Constraints

- the flow depends on the normalized topology tables being present
- business-unit/business-service/application pages are backend-backed, but detail enrichment remains best-effort
- company remains a contextual field, not the top-level navigation page

## Next Likely Steps

Likely next work for this feature:

1. tighten copy and visual hierarchy for business-unit-first navigation
2. decide whether company needs its own dedicated landing layer again
3. extend topology rollups beyond business unit and service if the product needs higher-level summaries
4. keep this tracker aligned whenever the drill-down flow changes materially

## Maintenance Rule

At the end of any chat that changes this feature:

- update this file to reflect the current implementation
- remove outdated statements when the direction changes
- keep it short enough that a future chat can read it quickly and continue work
