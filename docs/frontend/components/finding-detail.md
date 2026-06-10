# Finding Detail Component

## Summary

`FindingDetailPage` renders persisted finding detail, vulnerability context, remediation context, FAIR event frequency, and affected asset/business context.

## Source Files

- `frontend/src/components/dashboard/FindingDetailPage.tsx`
- `frontend/src/components/dashboard/FindingDetailSections.tsx`
- `frontend/src/hooks/findings/useFindingDetails.ts`
- `frontend/src/api/findings.ts`

## Data Rules

- The page uses `GET /findings/{finding_id}`.
- The backend returns persisted finding data only.
- The frontend should not assume live Brinqa narrative fields unless they are part of backend schemas.
- KEV detail content belongs in the body detail sections, not as a top hero badge.

## UI Responsibilities

- Normalize the detail title from display name and CVE.
- Show active/inactive state in the hero.
- Show risk, CVSS, EPSS, and age metric cards.
- Show FAIR event-frequency context without monetary loss inputs.
- Show supporting vulnerability, scoring, KEV, and asset/business fields when populated.

## Backend Contracts

- [Findings API](../../backend/api/findings.md)
- [FAIR Frontend Backend Contract](../../backend/fair/frontend-backend-contract.md)

## Tests

- `frontend/src/tests/components/dashboard/FindingDetailPage.test.tsx`
- `frontend/src/tests/hooks/findings/useFindingDetails.test.ts`
