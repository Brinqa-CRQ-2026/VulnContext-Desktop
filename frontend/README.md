# Frontend Data Contract Notes

This file tracks which backend data each frontend section depends on, and which fields are currently displayed.

## Current Backend Source

The frontend reads finding data from the FastAPI backend under `/scores/*`.

Canonical frontend contract file:

- `frontend/src/api.ts`

## Page-Level Data Dependencies

### Dashboard

Current status:

- not part of the active app flow right now
- summary/chart components remain on disk but are intentionally not rendered

### Findings Table

Primary files:

- `frontend/src/components/dashboard/RiskTable.tsx`
- `frontend/src/hooks/useScoresData.ts`

Backend endpoints:

- `GET /scores/all`
- `GET /scores/band/{risk_band}`
- `GET /scores/sources`

Currently displayed:

- finding display name
- source
- uid
- primary CVE and KEV tag
- target names and target count
- lifecycle / compliance / disposition / remediation tags
- risk owner and due date
- CVSS, EPSS, and age
- display risk and vendor risk

Current sort options used by the table:

- `risk_score`
- `internal_risk_score`
- `source_risk_score`
- `cvss_score`
- `epss_score`
- `age_in_days`
- `due_date`
- `source`

### Finding Detail Page

Primary file:

- `frontend/src/components/dashboard/FindingDetailPage.tsx`

Backend endpoints:

- `GET /scores/findings/{finding_db_id}`
- `POST /scores/findings/{finding_db_id}/disposition`
- `POST /scores/findings/{finding_db_id}/disposition/clear`

Currently displayed:

- finding identity and source metadata
- display risk, vendor risk, CVSS, EPSS
- disposition workflow
- KEV metadata
- description
- status, target, due-date, and finding timing fields
- ATT&CK and CVE/CWE context
- ownership and remediation fields

### Sources

Primary files:

- `frontend/src/components/integrations/IntegrationsPage.tsx`
- `frontend/src/components/dashboard/SeedEmptyState.tsx`

Backend endpoints:

- `GET /scores/sources`
- `PATCH /scores/sources/{source_name}`
- `DELETE /scores/sources/{source_name}`
- `POST /scores/seed/qualys-csv`

Currently displayed:

- source list
- source finding totals
- per-source risk distribution
- CSV upload flow

Current product direction:

- this page is effectively the source inventory page
- it is not being treated as a connector marketplace or integration catalog right now

### Risk Weights

Primary file:

- `frontend/src/components/dashboard/RiskWeightsEditor.tsx`

Backend endpoints:

- `GET /scores/weights`
- `PUT /scores/weights`

Currently displayed:

- CVSS weight
- EPSS weight
- KEV weight
- asset criticality weight
- analyst context weight

## Removed Frontend Path

No longer used:

- `frontend/src/components/dashboard/VulnerabilityDrawer.tsx`

Reason:

- the app now navigates directly to `FindingDetailPage` instead of maintaining a separate drawer view

## Current Follow-Up Opportunities

- remove dormant dashboard summary/chart components if they are no longer needed at all
- surface remediation summary and remediation plan more prominently in the detail page
- add table filters for lifecycle status, compliance status, and remediation status
- add source/integration provenance sections to the detail page if needed
