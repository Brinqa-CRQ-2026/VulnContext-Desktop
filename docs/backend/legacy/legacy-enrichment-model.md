# Legacy Enrichment Model

This file preserves the older enrichment direction at a high level without keeping several low-value implementation-specific legacy docs around.

## Previously deferred capabilities

- offline EPSS cache refresh
- offline NVD cache refresh
- KEV catalog matching as a separate feature track

## Why the detailed legacy docs were removed

- the current repo already keeps active enrichment sync scripts under `backend/scripts/`
- the deleted legacy docs described older local-cache implementations that do not map cleanly to the current Supabase-first flow
- if these capabilities are revisited, the current script-based workflow is the better starting point than the older app-owned cache model

## What to revisit if enrichment is rebuilt again

- where enrichment data should be stored
- whether refresh remains offline/scripted or becomes service-owned
- how enrichment outputs should surface in finding detail and scoring flows
