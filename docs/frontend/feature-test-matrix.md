# Frontend Feature And Test Matrix

## Current status

- Frontend test suite currently passes: `56 passed` on March 18, 2026.
- Frontend tests run with `vitest` and `@testing-library/react`.
- Frontend tests are intentionally isolated from the backend and from cross-module runtime behavior by using mocked boundaries.
- `components/ui` primitives are not the focus of direct feature tests because they are shared shadcn-style building blocks.

## Frontend features and what tests cover them

### 1. Frontend test harness and shared setup

Files:
- `frontend/vite.config.ts`
- `frontend/src/tests/setup.ts`

Covered cases:
- Vitest runs in `jsdom`.
- Shared DOM matchers are available through `jest-dom`.
- Global `fetch` is stubbed once for isolated API tests.
- Common browser APIs such as `matchMedia` and `ResizeObserver` are stubbed for component and hook tests.
- Mocks and environment overrides are reset between tests.

Edge cases covered:
- Repeated test runs do not reuse stale fetch calls or stale environment variables.
- Components that expect browser-only APIs can render in the test environment.

Not directly covered yet:
- A dedicated smoke test for `frontend/src/main.tsx`.
- A dedicated smoke/import test for CSS entry loading.

### 2. API client and frontend API wrappers

Files:
- `frontend/src/api/client.ts`
- `frontend/src/api/findings.ts`
- `frontend/src/api/imports.ts`
- `frontend/src/api/risk-weights.ts`
- `frontend/src/api/sources.ts`
- `frontend/src/api/index.ts`
- `frontend/src/api/types.ts`
- `frontend/src/tests/api/client.test.ts`
- `frontend/src/tests/api/findings.test.ts`
- `frontend/src/tests/api/imports.test.ts`
- `frontend/src/tests/api/risk-weights.test.ts`
- `frontend/src/tests/api/sources.test.ts`
- `frontend/src/tests/api/index.test.ts`
- `frontend/src/tests/api/types.test.ts`

Covered cases:
- The API client uses `VITE_API_BASE_URL` when it is configured.
- The API client falls back to the current browser host on port `8000` when no override is provided.
- The API client falls back to `http://127.0.0.1:8000` outside normal browser-host conditions.
- API URLs are built correctly for plain paths and query-string paths.
- JSON responses are returned for successful requests.
- Backend `detail` messages are surfaced when present.
- Fallback error messages are used when a response body cannot be parsed as JSON.
- Findings API helpers call the expected routes for top scores, summary, list, filtered list, finding detail, disposition set, and disposition clear.
- Findings list helpers send paging, sort, and optional source parameters correctly.
- Source filters are omitted when the filter is blank.
- Disposition clear only sends the `actor` query parameter when one is provided.
- CSV import sends a `FormData` payload with both `source` and `file`.
- Risk-weight update sends the full JSON payload expected by the backend.
- Source rename and delete encode source names correctly.
- The public API index re-exports the expected runtime API surface.
- Shared type unions and shape contracts are checked at the type level.

Edge cases covered:
- Blank source filters are trimmed away before request dispatch.
- Source names with spaces are encoded correctly in route paths.
- Invalid JSON error bodies still produce a stable frontend error.
- Optional disposition actor values are included only when meaningful.

Not directly covered yet:
- Exact request headers or options for every read-only GET helper beyond the main route assertions.
- A negative test for every individual API function’s fallback error string.
- Any browser-level network cancellation behavior.

### 3. Data-loading hooks

Files:
- `frontend/src/hooks/dashboard/useDashboardOverviewData.ts`
- `frontend/src/hooks/findings/useFindingDetails.ts`
- `frontend/src/hooks/findings/usePaginatedFindings.ts`
- `frontend/src/hooks/risk-weights/useRiskWeightsConfig.ts`
- `frontend/src/hooks/sources/useSourcesSummary.ts`
- `frontend/src/tests/hooks/dashboard/useDashboardOverviewData.test.ts`
- `frontend/src/tests/hooks/findings/useFindingDetails.test.ts`
- `frontend/src/tests/hooks/findings/usePaginatedFindings.test.ts`
- `frontend/src/tests/hooks/risk-weights/useRiskWeightsConfig.test.ts`
- `frontend/src/tests/hooks/sources/useSourcesSummary.test.ts`

Covered cases:
- Dashboard overview loads summary data and source data together.
- Dashboard overview exposes loading state before data is ready.
- Dashboard overview stores loaded data on success and exposes a readable error on failure.
- Finding details load by finding ID and reload when the ID changes.
- Finding details also reload when the refresh token changes.
- Paginated findings load the full findings list when the selected risk band is `All`.
- Paginated findings switch to the risk-band-specific API when a band filter is selected.
- Paginated findings pass page, page size, sort, and source filter values through to the API layer.
- Paginated findings reset back to page `1` when filters or sort inputs change.
- Paginated findings preserve paging behavior when only the current page changes.
- Risk-weight config loads current weights and reloads on refresh.
- Source summary loads source data and reloads on refresh.
- Hook error states are set when the mocked API layer rejects.

Edge cases covered:
- Page reset behavior when band, sort field, sort direction, or source filter changes.
- Readable hook-level fallback messages instead of raw thrown errors in several hooks.
- Refresh-token changes trigger a new request cycle without requiring component remount.

Not directly covered yet:
- Explicit unmount/no-state-update assertions for every hook.
- Loading race conditions between overlapping requests.
- A cancellation or stale-response guard in `usePaginatedFindings`.

### 4. App shell routing and refresh orchestration

Files:
- `frontend/src/app.tsx`
- `frontend/src/tests/app.test.tsx`

Covered cases:
- The app defaults to the findings page when no hash route is present.
- The app can navigate to the integrations page from header actions.
- The app can navigate to the integrations page from findings-table actions.
- Opening a finding moves the app into the finding detail route.
- Returning from finding detail brings the app back to the findings view.
- Child callbacks that report data changes increment the refresh token and cause dependent sections to refresh.

Edge cases covered:
- Hash-based route transitions are exercised without requiring the real child implementations.
- Refresh behavior is verified through mocked child boundaries rather than backend state.

Not directly covered yet:
- Invalid hash routes falling back to the findings list.
- Invalid or non-numeric finding IDs in the hash.
- Direct tests of the internal `parseHashRoute` and `writeHashRoute` helper paths.

### 5. Feature components tested through mocked boundaries

Files:
- `frontend/src/components/dashboard/RiskWeightsEditor.tsx`
- `frontend/src/components/integrations/IntegrationsPage.tsx`
- `frontend/src/tests/components/dashboard/RiskWeightsEditor.test.tsx`
- `frontend/src/tests/components/integrations/IntegrationsPage.test.tsx`

Covered cases:
- Risk-weights editing blocks invalid saves before the API call is made.
- Risk-weights editing accepts valid input, calls the update API, updates local state, and shows a success message.
- Integrations page renders its empty state when there are no sources.
- Integrations page renames a source through the mocked API boundary.
- Integrations page deletes a source after confirmation through the mocked API boundary.
- Integrations page triggers parent refresh callbacks after rename and delete actions.

Edge cases covered:
- Validation for weight totals that do not sum to `1.0`.
- Empty-state rendering without relying on backend data.
- Confirm-gated deletion flow.

Not directly covered yet:
- More-info modal behavior in risk weights.
- Per-field validation for values below `0` or above `1`.
- Rename validation for blank edited source names.
- Error rendering for failed rename, delete, or risk-weight save operations.
- Sorting and breakdown rendering details inside the integrations list.

## Bottom line

- The frontend now has real isolated coverage across the API layer, data hooks, app routing shell, and a small set of feature components.
- The strongest coverage is around mocked API behavior, hook state transitions, and app-level route/refresh coordination.
- The biggest remaining gaps are around untested feature components, additional negative UI flows, and a few app-routing edge cases.

## Recommended next tests

1. Add app-route fallback tests for invalid hashes and invalid finding IDs.
2. Add more feature-component tests for finding detail, dashboard overview, and risk table behavior using mocked hooks and child seams.
3. Add negative UI-flow tests for failed rename/delete/save actions and for risk-weight field bounds.
