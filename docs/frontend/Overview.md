# Frontend Overview

## Summary

The frontend is a React renderer running inside the Electron desktop shell. It is an operational vulnerability review interface for findings, topology drill-downs, FAIR context, sources, and security-score controls.

The renderer is intentionally read-oriented for findings, sources, and topology. It loads persisted backend data through typed API modules, coordinates request state in hooks, and renders dense review pages for analysts.

## Runtime Shape

1. `make desktop` starts the backend, Vite renderer, and Electron shell.
2. `frontend/src/app.tsx` owns route state, top page headers, and drill-down navigation.
3. `frontend/src/api/` wraps backend HTTP routes.
4. `frontend/src/hooks/` owns async loading, filters, sorting, pagination, and refresh tokens.
5. `frontend/src/components/` renders pages, shared table shells, topology chrome, charts, and FAIR panels.
6. `frontend/src/types/` mirrors backend response contracts used by API modules and components.

## Main User Flows

- Company overview -> Business Unit -> Business Service -> Application -> Asset -> Finding.
- Findings dashboard -> Finding detail.
- Sources page -> read-only source totals.
- Security Score -> current control assessment and FAIR control context.
- FAIR panels -> business-service loss exposure or application/asset/finding frequency context.

## Data Flow

Components do not fetch directly. Page components call hooks, hooks call API modules, and API modules return DTOs defined in `frontend/src/types`.

Backend schemas remain the source of truth. When a backend response changes, update:

1. backend schema/API docs
2. frontend DTOs
3. frontend API tests
4. affected hooks/components and their tests

## What To Read Next

- [Architecture](architecture/README.md)
- [Page Architecture](architecture/pages.md)
- [API Client And Data Contracts](api/README.md)
- [Components](components/README.md)
- [Hooks](hooks/README.md)
- [Types](types/README.md)
- [Testing](testing/README.md)
