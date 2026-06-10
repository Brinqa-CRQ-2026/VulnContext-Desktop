# Frontend Coverage Gaps

## Remaining Gaps

- Browser visual-regression screenshots for dense topology and findings pages. This is intentionally out of scope for the current unit/component pass.
- Responsive layout checks for table-heavy pages.
- Real Electron lifecycle tests for window close, shutdown, and child-process cleanup. Current coverage is limited to mocked renderer/runtime bridge behavior.
- Backend SQL, scoring, and Supabase behavior; these belong in backend tests.
- Live Brinqa enrichment/session recovery; this is legacy and not part of active frontend coverage.
- High-volume table performance with production-sized datasets.

## Environment Limits

- Tests run in jsdom, so layout measurements are incomplete.
- Recharts may warn about zero-width/zero-height containers in tests even when assertions pass.
- Network calls are mocked at the API layer.

## Recommended Future Additions

- Consider Playwright smoke tests for the main topology drill-down and finding detail flow in a separate E2E pass.
- Consider screenshot checks for top headers, data tables, and FAIR panels in a separate visual-regression pass.
- Consider a lightweight Electron launch smoke test after runtime behavior stabilizes.
