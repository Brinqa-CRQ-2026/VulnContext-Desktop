# Data Table Component

## Summary

`DataTable` is the shared frontend table shell for data that needs search, filters, sort controls, pagination, loading/error/empty states, row opening, and visual separation between identity columns and score columns.

## Source Files

- `frontend/src/components/shared/data-table/DataTable.tsx`
- `frontend/src/components/findings/FindingsTable.tsx`
- `frontend/src/components/topology/AssetInventoryPanel.tsx`
- `frontend/src/components/topology/shared/FindingsExplorerPanel.tsx`

## Responsibilities

- Render arbitrary item types through configured columns.
- Render search, select/toggle filters, sort controls, and pagination.
- Support loading, error, empty, and no-data-action states.
- Support row click and keyboard activation.
- Apply column group styling for score/risk sections.

## Consumer Pattern

Consumers own data fetching and state. The table receives:

- `items`
- `columns`
- `getRowId`
- optional search/filter/sort/pagination configs
- optional row open handler

The table should not fetch data, mutate rows, or know backend route details.

## Current Use

- Findings table wrapper for finding lists.
- Asset inventory tables for direct and application-scoped assets.
- Asset findings/business-unit findings explorer tables.

## Tests

- `frontend/src/tests/components/shared/data-table/DataTable.test.tsx`
- `frontend/src/tests/components/findings/FindingsTable.test.tsx`
- related page tests for asset, business-unit, and dashboard tables.
