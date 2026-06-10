# Frontend Coverage Gaps

## Remaining Gaps

- Browser visual-regression screenshots for dense topology and findings pages.
- Responsive layout checks for table-heavy pages.
- Real Electron lifecycle tests for window close, shutdown, and child-process cleanup.
- Backend SQL, scoring, and Supabase behavior; these belong in backend tests.
- Live Brinqa enrichment/session recovery; this is legacy and not part of active frontend coverage.
- High-volume table performance with production-sized datasets.

## Environment Limits

- Tests run in jsdom, so layout measurements are incomplete.
- Recharts may warn about zero-width/zero-height containers in tests even when assertions pass.
- Network calls are mocked at the API layer.

## Recommended Future Additions

- Add Playwright smoke tests for the main topology drill-down and finding detail flow.
- Add screenshot checks for top headers, data tables, and FAIR panels.
- Add a lightweight Electron launch smoke test after runtime behavior stabilizes.
