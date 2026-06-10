# Frontend API Tests

These tests protect request construction, API module boundaries, backend error parsing, and contract-critical frontend types.

## frontend/src/tests/api/client.test.ts

### Files Tested

- `frontend/src/api/client.ts`

### Cases Covered

- Resolves API base URL from `VITE_API_BASE_URL`.
- Falls back to browser host on backend port `8000`.
- Falls back to `127.0.0.1` outside an HTTP browser context.
- Prefixes paths and appends query parameters.
- Parses successful JSON responses.
- Records opt-in API timings for waterfall checks.

### Edge Cases Covered

- Throws backend `detail` messages when present.
- Throws fallback messages when error bodies are not valid JSON.

### Not Covered Here

- Browser retry behavior.
- Electron startup/runtime orchestration.

## frontend/src/tests/api/findings.test.ts

### Files Tested

- `frontend/src/api/findings.ts`
- finding DTOs from `frontend/src/types`

### Cases Covered

- Calls `GET /findings/top`.
- Calls `GET /findings/summary`.
- Sends paging, sort, and source params for paginated findings.
- Includes risk-band and optional source filters.
- Calls `GET /findings/{id}`.
- Preserves finding detail contract fields returned by the API.

### Edge Cases Covered

- Omits empty source filters.
- Surfaces backend errors.

### Not Covered Here

- Component rendering of finding detail.
- Backend scoring or response generation.

## frontend/src/tests/api/topology.test.ts

### Files Tested

- `frontend/src/api/topology.ts`
- topology query types from `frontend/src/types`

### Cases Covered

- Builds business-unit risk overview requests.
- Builds scoped business-unit findings requests.
- Sends paging, sorting, source, risk-band, and search filters.

### Edge Cases Covered

- Ensures optional query filters serialize only when provided by the API helper.

### Not Covered Here

- Topology page rendering.
- Backend topology rollup behavior.

## frontend/src/tests/api/sources.test.ts

### Files Tested

- `frontend/src/api/sources.ts`

### Cases Covered

- Calls `GET /sources`.
- Returns read-only source summary data from the API client.

### Edge Cases Covered

- Confirms the active module remains read-only.

### Not Covered Here

- Source mutation helpers; those are not part of the active surface.
- Source card rendering.

## frontend/src/tests/api/index.test.ts

### Files Tested

- `frontend/src/api/index.ts`
- `frontend/src/api/types.ts`

### Cases Covered

- Re-exports the public API surface.
- Re-exports shared types through the module boundary.

### Edge Cases Covered

- Keeps compatibility barrel behavior stable while types live under `frontend/src/types`.

### Not Covered Here

- Individual API request behavior.
- Backend route contracts.

## frontend/src/tests/api/types.test.ts

### Files Tested

- `frontend/src/types`
- compatibility exports from `frontend/src/api/types.ts`

### Cases Covered

- Exposes expected string unions and source summary shape.
- Exposes the enriched finding detail contract used by the frontend.

### Edge Cases Covered

- Contract-critical optional fields remain available for persisted finding detail rendering.

### Not Covered Here

- Runtime API calls.
- Backend schema validation.
