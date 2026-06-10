# Topology Page Components

## Summary

Topology pages render the company-to-finding drill-down path. They use persisted backend topology and asset data, not live Brinqa enrichment.

## Pages

| Page | Component | Primary hooks |
| --- | --- | --- |
| Company | `BusinessServicesOverview` | `useBusinessUnits` |
| Business Unit | `BusinessUnitDetailPage` | `useBusinessUnitDetail`, `useBusinessUnitRiskOverview`, `useBusinessUnitTopFindings` |
| Business Service | `BusinessServiceDetailPage` | `useBusinessServiceDetail`, `useBusinessServiceAnalytics`, asset inventory hooks |
| Application | `ApplicationDetailPage` | `useApplicationDetail`, asset inventory hooks |
| Asset | `AssetFindingsPage` | `useAssetFindings`, `useAssetFindingsAnalytics`, `useAssetDetail` |

## UI Rules

- Top page headers use the topology layer name only.
- Back navigation lives in the top `PageIntro`.
- Detail heroes should show entity identity and descriptive context, not duplicate back buttons.
- Asset hero shows status only; asset type and classification chips stay out of the hero.
- Direct assets and finding tables should use the shared data table shell.

## Backend Contracts

- [Topology And Assets API](../../backend/api/topology-and-assets.md)
- [FAIR Frontend Backend Contract](../../backend/fair/frontend-backend-contract.md)

## Tests

- `frontend/src/tests/components/business-services/*.test.tsx`
- `frontend/src/tests/app.test.tsx`
