# Frontend Component Tests

These tests protect public UI behavior for React components and pages. They use Vitest, React Testing Library, jsdom, local mocks, and reusable fixtures. They do not add E2E, Playwright, browser automation, visual regression, or real Electron launch coverage.

## Fixtures And Mocks

Fixtures are reusable fake data builders used by more than one test, for example `buildFinding()`, `buildAsset()`, and `buildTableRows()`. They live under `frontend/src/tests/fixtures/` and keep typed test data consistent without repeating large object literals.

Mocks stay local when only one test file needs them. Shared boundaries currently include Electron bridge mocks under `frontend/src/tests/mocks/`, route helpers under `frontend/src/tests/utils/`, and typed finding/topology/table fixtures under `frontend/src/tests/fixtures/`.

## Shared Components

### `frontend/src/tests/components/shared/LoadingSpinnerState.test.tsx`

- Source: `frontend/src/components/shared/LoadingSpinnerState.tsx`
- Covers: default and custom loading copy.
- Mocks: none.
- Gaps: animation timing and visual layout.

### `frontend/src/tests/components/shared/data-table/DataTable.test.tsx`

- Source: `frontend/src/components/shared/data-table/DataTable.tsx`
- Covers: headers, row rendering, grouped score styling, search, select filters, toggle filters, sorting, pagination, row click, dense rows, loading, error, empty, disabled pagination boundaries, and no-row-action behavior.
- Mocks/fixtures: `buildTableRows()`.
- Gaps: browser overflow/scroll rendering and backend filtering/sorting.

## Table Wrappers

### `frontend/src/tests/components/findings/FindingsTable.test.tsx`

- Source: `frontend/src/components/findings/FindingsTable.tsx`
- Covers: configured column order, search/filter/sort callbacks, row click, loading, error, and empty states.
- Mocks: local handler spies.
- Gaps: domain page data loading.

### `frontend/src/tests/components/topology/FindingsExplorerPanel.test.tsx`

- Source: `frontend/src/components/topology/shared/FindingsExplorerPanel.tsx`
- Covers: finding rows, KEV badges, source filter visibility, search submit, risk filter, KEV toggle, source filter, sort, pagination, row open, and empty state.
- Mocks/fixtures: `buildFinding()`, local handler spies.
- Gaps: backend finding search/filter behavior.

### `frontend/src/tests/components/topology/AssetInventoryPanel.test.tsx`

- Source: `frontend/src/components/topology/AssetInventoryPanel.tsx`
- Covers: hook scope params, populated assets, row open, search/filter/sort/pagination wiring, loading, error, empty, and analytics-warning states.
- Mocks/fixtures: local mock for `useAssetInventoryState`, `buildAsset()`.
- Gaps: real Recharts layout and backend asset inventory behavior.

## Topology Shared UI

### `ChartPanel`, `MetricCard`, `TopologyBadges`, `PageIntro`, `TopologyChrome`, `EntityHero`, `EntityCard`

- Sources: `frontend/src/components/topology/shared/*` and `frontend/src/components/topology/TopologyChrome.tsx`
- Tests:
  - `ChartPanel.test.tsx`
  - `MetricCard.test.tsx`
  - `TopologyBadges.test.tsx`
  - `PageIntro.test.tsx`
  - `TopologyChrome.test.tsx`
  - `EntityHero.test.tsx`
  - `EntityCard.test.tsx`
- Covers: loading/error/empty chart panel priority, metric formatting, optional hints, status/risk badges, page intro actions, breadcrumb formatting/clicks, hero fallback/metadata/actions, base/entity-card rendering, and card open callbacks.
- Mocks/fixtures: topology fixture builders where typed entity data is repeated.
- Gaps: visual responsive layout.

## Topology Pages

### `TopologyOverviewPage.test.tsx`

- Source: `frontend/src/pages/topology/TopologyOverviewPage.tsx`
- Covers: loading, empty companies, company cards, card ordering, business-unit navigation, schema-unavailable errors, and generic load errors.
- Mocks: `useBusinessUnits`.

### `BusinessUnitDetailPage.test.tsx`

- Source: `frontend/src/pages/topology/BusinessUnitDetailPage.tsx`
- Covers: loading, schema unavailable, generic error, empty child services, analytics-error rendering, metrics, risk overview, business-service cards, scoped findings table, KEV filter control, and service navigation.
- Mocks: `useBusinessUnitDetail`, `useBusinessUnitRiskOverview`, `useBusinessUnitTopFindings`.

### `BusinessServiceDetailPage.test.tsx`

- Source: `frontend/src/pages/topology/BusinessServiceDetailPage.tsx`
- Covers: loading, schema unavailable, generic error, empty applications/assets, analytics warning, service metrics, application cards, direct asset table, asset-open callback, and API order preservation.
- Mocks: business-service detail/analytics hooks plus asset inventory hooks.

### `ApplicationDetailPage.test.tsx`

- Source: `frontend/src/pages/topology/ApplicationDetailPage.tsx`
- Covers: loading, schema unavailable, generic error, application metrics, asset table columns, asset-findings entry points, inventory controls, and asset row ordering.
- Mocks: application detail and asset inventory hooks.

### `AssetFindingsPage.test.tsx`

- Source: `frontend/src/pages/topology/AssetFindingsPage.tsx`
- Covers: loading, not found/error, analytics-warning, asset-detail-warning, empty findings, compact asset-first layout, risk spread, findings table columns, source/filter params, server order, and finding-open route origin.
- Mocks: asset detail, asset findings, and asset findings analytics hooks.

### `AssetDistributionCharts.test.tsx`

- Source: `frontend/src/components/topology/AssetDistributionCharts.tsx`
- Covers: chart card rendering and unscored segment inclusion/exclusion.
- Gaps: Recharts pixel layout in a real browser.

## Dashboard And Findings

### `DashboardOverview.test.tsx`

- Source: `frontend/src/components/dashboard/DashboardOverview.tsx`
- Covers: first-load state, hook refresh-token wiring, summary rendering, and non-blocking error display.
- Mocks: `useDashboardOverviewData`.

### `SummaryCards.test.tsx`

- Source: `frontend/src/components/dashboard/SummaryCards.tsx`
- Covers: first-load placeholders, formatted counts, KEV/critical counts, average score, and partial-data fallbacks.

### `RiskBandDistributionChart.test.tsx`

- Source: `frontend/src/components/dashboard/RiskBandDistributionChart.tsx`
- Covers: loading, empty, and populated chart states without browser layout assertions.
- Gaps: Recharts jsdom size warnings are accepted.

### `FindingDetailPage.test.tsx`

- Source: `frontend/src/components/dashboard/FindingDetailPage.tsx`
- Covers: loading, not found/error, dense detail layout, non-KEV details, KEV detail placement, missing remediation narrative, title normalization, metric cards, supporting tabs, and optional field behavior.
- Mocks: `useFindingDetails`.
- Gaps: `onDataChanged` is not currently invoked by this component.

### `FindingDetailSections.test.tsx`

- Source: `frontend/src/components/dashboard/FindingDetailSections.tsx`
- Covers: missing optional CVE/CVSS/CWE/reference fields, fallback copy, remediation reference selection, runtime-wrapper external link behavior, identifiers, record links, and conditional attack tab rendering.
- Mocks: `openExternalUrl`.

### `RiskTable.test.tsx`

- Source: `frontend/src/components/dashboard/RiskTable.tsx`
- Covers: main findings table columns, scores/status rendering, row open, and current column expectations.
- Mocks: findings explorer hook.

## Integrations, Controls, FAIR, And Shell

### `IntegrationsPage.test.tsx`

- Source: `frontend/src/components/integrations/IntegrationsPage.tsx`
- Covers: loading, error, empty, populated source ordering, finding-count display, and read-only runtime note.
- Mocks: `useSourcesSummary`.

### `SecurityScorePage.test.tsx`

- Source: `frontend/src/components/controls/SecurityScorePage.tsx`
- Covers: saved assessment load, load failure, answer change auto-save, save failure, manual save, reset, copy success/failure, and local security-score context persistence.
- Mocks: `api/controls`, `navigator.clipboard`, local storage.
- Gaps: backend persistence semantics and browser clipboard permissions.

### `FairPanels.test.tsx`

- Sources: `frontend/src/components/fair/FairFrequencyPanel.tsx`, `frontend/src/components/fair/FairScopeLossPanel.tsx`
- Covers: closed/open info panels, successful prediction display, failed prediction errors, loading-through-async behavior, request payload wiring, local control context inclusion, and loss assumption changes.
- Mocks: `onPredict` callbacks only. FAIR production logic is not changed or reimplemented.

### `Header.test.tsx` and `AppSidebar.test.tsx`

- Sources: `frontend/src/components/layout/Header.tsx`, `frontend/src/pages/shell/AppSidebar.tsx`
- Covers: brand rendering, shutdown callback, shutdown pending disabled state, nav items, active state, and route callback wiring.

## Intentional Gaps

- Real Recharts layout and pixel rendering.
- Browser overflow, responsive layout, and visual regression.
- Backend SQL, scoring, Supabase, and request handler behavior.
- Real Electron launch and window lifecycle.
- E2E route flows.
