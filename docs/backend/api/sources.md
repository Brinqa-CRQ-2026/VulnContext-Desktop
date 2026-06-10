# Backend Sources API

## Summary

This is the smallest active API surface. It exposes a read-only source summary derived from findings.

## Route

### `GET /sources`

Inputs:

- no query parameters

Outputs:

- `SourceSummary[]`
- source name and finding count for each persisted source bucket

Behavior notes:

- returns `SourceSummary[]`
- used to show source counts in the UI
- there are no active source rename or delete routes
- the response is read-only and derived from persisted findings data
