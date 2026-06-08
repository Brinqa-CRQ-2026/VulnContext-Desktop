# Legacy Brinqa Auth

The desktop app previously opened a Brinqa login window before showing the
dashboard. Electron watched Brinqa MFA network traffic, captured the MFA
response, extracted a token-like value, stored it in renderer `localStorage`,
and attempted remote Brinqa session reset/logout during logout and shutdown.

That flow was removed from the active runtime because it depended on Brinqa
environment access, browser session cookies, and token state that are no longer
available to the app. The current runtime starts straight into the dashboard and
does not send Brinqa auth headers from the renderer.
