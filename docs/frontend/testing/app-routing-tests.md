# Frontend App Routing Tests

These tests protect route state, top-header navigation, drill-down context, and app shell callbacks.

## frontend/src/tests/app.test.tsx

### Files Tested

- `frontend/src/app.tsx`
- `frontend/src/runtime/desktopBridge.ts`

### Cases Covered

- Renders the business-services overview by default.
- Navigates to integrations from header and table actions.
- Navigates through Company, Business Unit, Business Service, Application, and Asset routes.
- Top-header back buttons return to the previous topology layer.
- Opens a finding detail route from the findings table and returns to findings.
- Preserves asset breadcrumb context when opening a finding from asset findings.
- Increments `refreshToken` when child callbacks report data changes.
- Triggers app shutdown through the desktop bridge.

### Edge Cases Covered

- Asset-origin finding details preserve business-unit, service, application, and asset breadcrumb labels.
- Finding back behavior differs between dashboard-origin and asset-origin findings.

### Not Covered Here

- Real browser history integration beyond app route state.
- Electron window-close interception.
- Backend process shutdown.
- Visual overlap or responsive layout.

## Related Docs

- [Frontend Overview](../Overview.md)
- [Page Architecture](../architecture/pages.md)
- [Desktop Runtime](../runtime/README.md)
