# Documentation

Repo documentation is organized by area.

## Backend

- `docs/backend/README.md`
  Backend docs index. Split into current, planning, legacy, and tracked topology seed sources.

## Frontend

- `docs/frontend/data-contract.md`
- `docs/frontend/api.md`
- `docs/frontend/hooks.md`
- `docs/frontend/structure.md`
- `docs/frontend/components.md`
- `docs/frontend/feature-test-matrix.md`

## Recent Changes In This Push

- Topology drill-down pages now cover business units, business services, applications, assets, and finding detail navigation.
- Asset findings now uses server-backed pagination with `10` rows per page plus search, source, risk-band, KEV, and sort controls.
- Finding detail now uses breadcrumb-aware read-only investigation UX instead of the old remediation editor workflow.
- Backend finding summaries now expose CRQ-first display and scoring fields, with enrichment fallback for CVSS, EPSS, and KEV data.
