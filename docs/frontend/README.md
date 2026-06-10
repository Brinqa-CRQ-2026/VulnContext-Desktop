# Frontend Docs

## Summary

Frontend docs describe the current React/Electron renderer and the conventions
for future frontend work.

## Start Here

- [Overview](Overview.md)
- [Architecture](architecture/README.md)
- [API Client And Data Contracts](api/README.md)
- [Hooks](hooks/README.md)
- [Types](types/README.md)
- [UI Patterns](ui/README.md)
- [Desktop Runtime](runtime/README.md)
- [Frontend Testing](testing/README.md)

## Documents

| Area | Path | Purpose |
| --- | --- | --- |
| Overview | [Overview.md](Overview.md) | Runtime purpose, data flow, and main user flows |
| Architecture | [architecture/](architecture/README.md) | Folder ownership, type boundaries, import rules, and high-traffic flows |
| API | [api/](api/README.md) | Read-only API modules and schema-aligned DTO rules |
| Components | [components/](components/README.md) | Page components, shared table patterns, and major UI surfaces |
| Hooks | [hooks/](hooks/README.md) | Hook organization, topology hook domains, and async state conventions |
| State | [state/](state/README.md) | Legacy hook index kept for compatibility with older docs links |
| Types | [types/](types/README.md) | Frontend DTO and shared type ownership |
| UI | [ui/](ui/README.md) | Component ownership, UI patterns, and frontend style guide |
| Runtime | [runtime/](runtime/README.md) | Electron dashboard lifecycle and shutdown behavior |
| Testing | [testing/](testing/README.md) | Current automated and manual frontend coverage notes |

## Ownership

Put frontend implementation details here. Backend route contracts belong in
`docs/backend/api/`, and shared frontend/backend expectations belong in
`docs/frontend/api/`.
