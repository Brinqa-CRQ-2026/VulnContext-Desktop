# FAIR, Controls, And Security Score Tests

These tests cover the FAIR loss prediction pipeline, controls persistence contracts, and security-score helpers.

## backend/tests/services/fair/test_fair_internals.py

### Cases Covered

- Clamps threat-event frequency probability of action and increases action probability for KEV findings.
- Validates loss-event frequency probability inputs and returns bounded distributions.
- Covers inferred controls and user-blended control paths.
- Checks vulnerability models for bounded, context-sensitive output.
- Verifies frequency engine orchestration of TEF, vulnerability, controls, and LEF results.
- Covers loss-magnitude requested means, zero-mean handling, and fallback loss paths.

### Not Covered Here

- Large Monte Carlo statistical confidence.
- Frontend FAIR visualization behavior.

## backend/tests/services/fair/test_loss_prediction.py

### Cases Covered

- Builds loss-prediction context from asset and finding scores with bounded fallbacks.
- Handles empty, zero, and positive values in loss histograms.
- Orchestrates frequency, magnitude, and risk engines through the prediction service.

### Not Covered Here

- HTTP route mapping for FAIR endpoints.
- Long-running/high-iteration simulations.

## backend/tests/services/test_security_score.py

### Cases Covered

- Normalizes nested and flat control answers.
- Bounds maturity/control values.
- Computes domain scores, confidence, and flat context values.
- Keeps helper output deterministic and bounded.

### Not Covered Here

- Supabase persistence.
- Security-score page rendering.

## backend/tests/api/test_fair_loss.py

### Cases Covered

- Maps finding FAIR loss requests and payloads to the prediction service.
- Returns `404` for an unknown finding.
- Maps asset, application, and business-service FAIR scope requests.
- Returns empty predictions for missing application scope.
- Aggregates ranked asset findings for scope predictions.
- Uses normalized asset foreign keys when application scope has backfilled topology links.

### Not Covered Here

- Real production traffic volume or long-running simulation latency.
- Postgres-specific execution plans.

## backend/tests/api/test_controls.py

### Cases Covered

- Normalizes answers through `POST /controls/security-score`.
- Returns the default current assessment when Supabase has no rows.
- Inserts and updates the current assessment through `PUT /controls/current`.
- Keeps legacy `POST /controls/save` delegated to the current-save path.
- Returns the latest saved assessment or `null`.
- Returns `503` when Supabase environment is missing.
- Maps Supabase read and write failures to `502`.
- Rejects missing Supabase rows during response coercion.

### Not Covered Here

- Real Supabase client behavior against a live project.
- Row-level security, network retries, and production auth configuration.
