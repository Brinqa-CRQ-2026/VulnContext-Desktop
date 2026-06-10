# Frontend Utility Tests

These tests protect small pure helpers used across components and hooks.

## frontend/src/tests/lib/formatting.test.ts

### Files Tested

- `frontend/src/lib/formatting/dates.ts`
- `frontend/src/lib/formatting/numbers.ts`
- `frontend/src/lib/formatting/text.ts`

### Cases Covered

- Formats numbers with configurable fallback text.
- Formats dates while keeping invalid date strings visible.
- Formats ages in days.
- Joins populated display text with fallback.

### Edge Cases Covered

- Null/undefined values use fallbacks.
- Invalid date strings are not hidden.

### Not Covered Here

- Locale-specific formatting beyond current helper behavior.
- Browser rendering of formatted values in complex components.

## frontend/src/tests/lib/pagination.test.ts

### Files Tested

- `frontend/src/lib/pagination/getPaginationWindow`

### Cases Covered

- Returns a centered page window.
- Clamps page numbers to valid bounds.

### Edge Cases Covered

- Handles beginning and end of the page range.

### Not Covered Here

- Backend pagination semantics.
- Component pagination button rendering.

## frontend/src/tests/lib/externalUrls.test.ts

### Files Tested

- `frontend/src/lib/externalUrls.ts`

### Cases Covered

- Accepts HTTP and HTTPS URLs.
- Rejects internal and non-HTTP URLs.

### Edge Cases Covered

- Non-URL strings and unsupported protocols are treated as non-external.

### Not Covered Here

- Browser navigation behavior.
- Link rendering in components.
