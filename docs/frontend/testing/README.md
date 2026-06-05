# Frontend Feature And Test Matrix

This page maps the current frontend test suite to the runtime behavior it protects. Frontend tests rely on persisted backend metadata and API contracts; they do not cover live Brinqa enrichment fetches.

## API Tests

### frontend/src/tests/api/client.test.ts

#### Cases Covered

- Resolves the API base URL from `VITE_API_BASE_URL`, browser host fallback, or `127.0.0.1`.
- Builds request URLs with paths and query parameters.
- Parses successful JSON responses and backend error details.
- Records opt-in API timing entries for waterfall checks.

#### Not Covered Here

- Browser network retries.
- Electron startup/runtime orchestration.

### frontend/src/tests/api/findings.test.ts

#### Cases Covered

- Calls top findings, summary, paginated findings, filtered findings, and finding detail routes.
- Sends paging, sorting, source, and risk-band filters.
- Omits empty source filters.
- Surfaces backend errors.

#### Not Covered Here

- Component rendering of finding detail.
- Live Brinqa enrichment calls.

### frontend/src/tests/api/topology.test.ts

#### Cases Covered

- Builds business-unit risk overview requests.
- Builds scoped business-unit findings requests with paging, sorting, source, risk-band, and search filters.

#### Not Covered Here

- Asset findings page rendering.
- Live enrichment recovery.

### frontend/src/tests/api/sources.test.ts, index.test.ts, and types.test.ts

#### Cases Covered

- Calls the read-only sources summary route.
- Keeps the public API barrel exports stable.
- Checks contract-critical frontend type unions and source summary shape.

#### Not Covered Here

- Source mutation helpers; those are not part of the active frontend surface.

## Hooks

### frontend/src/tests/hooks/findings/*

#### Cases Covered

- Loads finding detail and paginated finding pages.
- Passes source, sort, risk-band, and paging filters.
- Resets page state when filters change.
- Reloads on `refreshToken` changes and stores readable errors.
- Builds explorer data and applies local KEV filtering.

#### Not Covered Here

- Backend scoring math.
- Finding detail visual layout.

### frontend/src/tests/hooks/topology/*

#### Cases Covered

- Loads business-unit risk overview and scoped top findings.
- Loads asset, asset findings, and asset analytics data with expected filters.
- Handles missing slug inputs as not-found errors.
- Uses persisted asset metadata and analytics responses instead of live enrichment.

#### Not Covered Here

- Topology page component rendering.
- Brinqa live-fetch session recovery.

### frontend/src/tests/hooks/dashboard/* and hooks/sources/*

#### Cases Covered

- Loads dashboard summary and source data together.
- Loads source summaries on mount.
- Reloads when `refreshToken` changes.
- Stores readable errors on failed requests.

#### Not Covered Here

- Backend aggregation implementation.

## Components And App Shell

### frontend/src/tests/components/business-services/AssetFindingsPage.test.tsx

#### Cases Covered

- Renders the compact asset-first findings layout from persisted asset metadata.
- Opens a finding from the asset findings table.
- Confirms the old Brinqa enrichment probe and run button are absent.
- Passes analytics filters without requesting live enrichment.
- Shows table rows in server-provided order.

#### Not Covered Here

- Backend asset findings SQL behavior.
- Live Brinqa enrichment fetches.

### frontend/src/tests/components/business-services/*.test.tsx

#### Cases Covered

- Renders business-service, business-unit, application, overview, and distribution pages from persisted topology responses.
- Preserves API order where the UI expects backend ordering.
- Handles schema-not-initialized and generic load-failure states.
- Exposes drill-down and asset-findings navigation entry points.

#### Not Covered Here

- Backend topology rollup calculations.
- Browser visual-regression screenshots.

### frontend/src/tests/components/dashboard/*.test.tsx

#### Cases Covered

- Renders dense finding detail and risk table layouts from persisted fields.
- Keeps KEV details visible only for KEV findings.
- Avoids large empty remediation callouts when remediation narrative is absent.
- Shows risk score, asset, and business context without a vendor-risk column.

#### Not Covered Here

- Historical Brinqa-only narrative fields.
- Backend finding detail response generation.

### frontend/src/tests/components/integrations/IntegrationsPage.test.tsx

#### Cases Covered

- Renders empty source state.
- Sorts source cards by descending finding count.
- Shows the read-only runtime note.

#### Not Covered Here

- Source create, rename, or delete flows.

### frontend/src/tests/app.test.tsx

#### Cases Covered

- Renders the business-services overview by default.
- Navigates through integrations, topology drill-down, finding detail, and asset finding breadcrumb flows.
- Increments refresh token when child pages report data changes.
- Calls the desktop Brinqa session reset bridge for logout and shutdown.

#### Not Covered Here

- Native window-close interception.
- Backend process shutdown.

## Auth And Runtime Helpers

### frontend/src/tests/auth/electronBrinqa.test.ts and brinqaRemoteLogout.test.ts

#### Cases Covered

- Dedupes unauthorized resets after local auth is cleared.
- Clears renderer auth after successful logout reset.
- Calls remote reset/logout with bearer token and session cookie.

#### Not Covered Here

- Real Brinqa authentication behavior.
- Backend-mediated enrichment or token exchange.

## Utility Tests

### frontend/src/tests/lib/*.test.ts

#### Cases Covered

- Formats numbers, dates, age values, and joined display text with fallbacks.
- Returns a centered pagination window clamped to valid page numbers.

#### Not Covered Here

- Locale-specific formatting beyond the current utility behavior.

## Commands

For frontend code changes, run:

- `cd frontend && npm test`
- `cd frontend && npm run build`

For docs-only changes, validate links and stale path references with `rg` before committing.

## Related Docs

- [Frontend Architecture](../architecture/README.md)
- [Frontend Runtime](../runtime/README.md)
