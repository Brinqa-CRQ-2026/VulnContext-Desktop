# Frontend Docs

## Summary

Frontend docs describe the current React/Electron renderer and the conventions
for future frontend work.

## Start Here

- [Architecture](architecture/README.md)
- [API Client And Data Contracts](api/README.md)
- [State And Hooks](state/README.md)
- [UI Patterns](ui/README.md)
- [Desktop Runtime](runtime/README.md)
- [Frontend Test Matrix](testing/README.md)

## Documents

| Area | Path | Purpose |
| --- | --- | --- |
| Architecture | [architecture/](architecture/README.md) | Folder ownership, type boundaries, import rules, and high-traffic flows |
| API | [api/](api/README.md) | Read-only API modules and schema-aligned DTO rules |
| State | [state/](state/README.md) | Hook organization, topology hook domains, and state conventions |
| UI | [ui/](ui/README.md) | Component ownership, UI patterns, and frontend style guide |
| Runtime | [runtime/](runtime/README.md) | Electron dashboard lifecycle and shutdown behavior |
| Testing | [testing/](testing/README.md) | Current automated and manual frontend coverage notes |

## Ownership

Put frontend implementation details here. Backend route contracts belong in
`docs/backend/api/`, and shared frontend/backend expectations belong in
`docs/frontend/api/`.
