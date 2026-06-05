# Frontend Feature And Test Matrix

## Summary

This page maps the current frontend test suite to the runtime behavior it
protects.

## Current Suite

- API tests cover the active read-only findings, sources, topology, and shared client modules.
- Hook tests cover dashboard, findings, topology, and source-summary loading behavior.
- Type tests cover shared frontend type unions and contract-critical DTO assumptions.
- App-shell tests cover routing through findings, sources, topology drill-down paths, and header-triggered logout/shutdown actions.
- Component tests cover active page components such as integrations/source summary and topology pages.
- Auth bridge tests cover renderer reset behavior and deduping.
- Unauthorized enrichment recovery is covered through `useAssetEnrichment`.

## Manual Verification

- The user manually verified that `Log Out` works as intended.
- The user manually verified that `Shut Down` works as intended.
- Normal window close was later aligned to the same shutdown path as `Shut Down`.

Do not read the manual notes above as automated coverage for native window-close interception unless a dedicated test is added later.

## Explicitly Removed From Test Scope

The suite no longer needs direct coverage for:

- CSV import API wrappers
- risk-weight APIs or hooks
- finding disposition write helpers
- source rename/delete helpers

Those features are not part of the active runtime.

## Frontend Change Checklist

For frontend code changes, run:

- `cd frontend && npm test`
- `cd frontend && npm run build`

For docs-only changes, validate links and stale path references with `rg` before committing.

## Related Docs

- [Frontend Architecture](../architecture/README.md)
- [Frontend Runtime](../runtime/README.md)
