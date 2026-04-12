# Business Services Feature Tracker

This file tracks the current state of the business-context expansion so future chats can continue from the latest agreed direction.

## Goal

Add a business-context navigation layer above findings:

- `Company -> Business Unit -> Business Service -> Assets -> Findings`

The current implemented scope is:

- company overview landing page
- company/business-unit drill-in page
- mock-backed data only

## Current Implementation State

### Routing

- frontend routing supports Business Services as the default landing path
- FastAPI serves the built frontend for:
  - `/`
  - `/business-services`
  - `/business-services/:slug`
- Business Services uses HTTP path routing
- findings and integrations still use hash-style routing to avoid collisions with backend API routes

### Overview Page

Current overview page is a company-first landing page.

Implemented behavior:

- page header title is `Company Overview`
- overview header description is intentionally removed
- top metric cards show only:
  - total companies
  - affected assets
  - open findings
- one company card is shown for each company in the current mocked dataset
- current companies are:
  - `Virtuon`
  - `Cyberdyne Systems`
- business unit is shown directly under the company name on each card
- company cards are dark blue with white centered text
- company cards are more defined/prominent than before
- company cards are shorter than the earlier square version
- company card stats are displayed in one horizontal row
- each company card stat uses:
  - bold larger number
  - centered label underneath

### Company Drill-In Page

Clicking a company card opens a company/business-unit specific page.

Implemented behavior:

- page title becomes the company name
- page shows the related business unit
- page lists business services for that company/business unit
- each listed business service shows:
  - number of open findings
  - number of affected assets

## Mock Data In Use

Current mocked business services:

- `Digital Media` / `Online Store` / `Virtuon` / `248 assets` / `5310 findings`
- `Digital Storefront` / `Online Store` / `Virtuon` / `196 assets` / `4312 findings`
- `Shipping and Tracking` / `Online Store` / `Virtuon` / `93 assets` / `1582 findings`
- `Logistics` / `Manufacturing` / `Cyberdyne Systems` / `118 assets` / `2172 findings`
- `Manufacturing Shop` / `Manufacturing` / `Cyberdyne Systems` / `104 assets` / `1929 findings`

## Files Added Or Changed For This Feature

- `frontend/src/mocks/businessServices.ts`
- `frontend/src/components/business-services/BusinessServicesOverview.tsx`
- `frontend/src/components/business-services/BusinessServiceDetailPage.tsx`
- `frontend/src/app.tsx`
- `frontend/src/components/layout/Header.tsx`
- `backend/app/main.py`
- `backend/tests/test_api_contract.py`
- `frontend/src/tests/app.test.tsx`
- `frontend/src/tests/components/business-services/BusinessServicesOverview.test.tsx`

## Current Constraints

- backend business-service/company APIs are not implemented yet
- this feature is still mock-backed
- styling has been improved incrementally, but this is still not treated as a final design system pass

## Next Likely Steps

Likely next work for this feature:

1. define the company/business-unit detail page more precisely
2. add the next layer for business-service selection beneath company/business unit
3. define the assets page structure
4. later replace mocks with backend data once the user asks for it

## Maintenance Rule

At the end of any chat that changes this feature:

- update this file to reflect the current implementation
- remove outdated statements when the direction changes
- keep it short enough that a future chat can read it quickly and continue work
