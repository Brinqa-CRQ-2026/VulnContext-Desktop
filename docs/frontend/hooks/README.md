# Frontend Hooks

## Summary

Hooks own async request state, pagination state, filter state, refresh behavior, and error normalization. They should not render JSX.

## Hook Areas

| Area | Hooks | Purpose |
| --- | --- | --- |
| Dashboard | `useDashboardOverviewData` | findings/source summary loading |
| Findings | `usePaginatedFindings`, `useFindingDetails`, `useFindingsExplorerState` | finding lists, detail, and local explorer state |
| Sources | `useSourcesSummary` | source summary loading |
| Business units | `useBusinessUnits`, `useBusinessUnitDetail`, `useBusinessUnitRiskOverview`, `useBusinessUnitTopFindings` | company and business-unit pages |
| Business services | `useBusinessServiceDetail`, `useBusinessServiceAnalytics` | service detail and analytics |
| Applications | `useApplicationDetail` | application detail |
| Assets | `usePaginatedAssets`, `useAssetInventoryState`, `useAssetsAnalytics`, `useAssetDetail`, `useAssetFindings`, `useAssetFindingsAnalytics` | asset lists, asset detail, and asset findings |

## Conventions

- Return `loading`, `error`, and domain data consistently.
- Accept `refreshToken` when a parent page can force reloads.
- Reset page state when filters, search, or sort inputs change.
- Keep query option object types local unless shared by multiple hooks.
- Convert backend errors into readable strings for components.
- Keep formatting and display-only decisions in components or `frontend/src/lib`.

## Related Docs

- [API Client](../api/README.md)
- [Data Contracts](../api/data-contracts.md)
- [Hook Tests](../testing/hook-tests.md)
