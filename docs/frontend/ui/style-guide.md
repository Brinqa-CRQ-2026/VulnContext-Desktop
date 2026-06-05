# Frontend Style Guide

Use this guide when adding or changing frontend features.

## Architecture Defaults

- Put backend request functions in `frontend/src/api`.
- Put shared response, query, route-state, risk, chart, pagination, and topology types in `frontend/src/types`.
- Keep component props local unless reused.
- Keep feature-only business-services view types in `frontend/src/components/business-services/types.ts`.
- Put shared formatting, sorting, chart, finding, asset, pagination, and topology helpers in `frontend/src/lib`.

## Type And Contract Rules

- Match frontend DTOs to `backend/app/schemas.py`.
- Treat backend route `response_model`s as the API contract.
- Do not add frontend type fields unless the backend schema returns them.
- Prefer explicit response names such as `AssetFindingsPageResponse` when a type name could conflict with a component.
- Keep compatibility aliases temporary and document why they exist.

## UI Rules

- Build the actual work surface first; do not add marketing-style landing pages.
- Use existing UI primitives before adding new primitives.
- Use lucide icons for button/icon controls when an icon exists.
- Keep operational views compact and scannable.
- Use cards for repeated items, modals, or framed tools; avoid nested cards.
- Keep table, board, toolbar, and counter dimensions stable so content does not shift on hover or data changes.
- Do not show empty sections for fields the backend does not return.

## Hook And State Rules

- Hooks own loading/error/data state and filter/pagination coordination.
- Components own rendering and display copy.
- Use domain folders for topology hooks and direct imports from those folders.
- Keep option object types next to hooks until reused.
- Preserve existing hook return shapes unless updating all consumers and tests in one pass.

## Testing Rules

- Add focused API tests when request parameters or response handling change.
- Add hook tests for loading, error, filtering, pagination, and reset behavior.
- Add component tests for user-visible states and important callbacks.
- Update type tests when shared type unions or contract-critical DTOs change.
- Run `npm test` and `npm run build` for frontend code changes.
