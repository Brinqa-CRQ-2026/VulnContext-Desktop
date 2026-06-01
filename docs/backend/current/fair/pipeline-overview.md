# FAIR Pipeline Overview

The FAIR pipeline estimates annualized loss for a business service by combining:

1. control maturity
2. threat event frequency
3. vulnerability
4. loss event frequency
5. loss magnitude
6. annual loss simulation

At a high level:

```text
Security Score
        |
        v
Nested control answers
        |
        v
Control score
        |
        v
Business service + application + asset + finding context + EPSS + KEV
        |
        v
Scope aggregation -> FrequencyEngine -> LM -> RiskEngine
        |
        v
Annual loss distribution + P50/P90/P95/P99/worst loss
        |
        v
Business service FAIR panel and summary stats
```

## Main Backend Orchestrator

File:

- `backend/app/services/fair/loss_prediction.py`

Primary class:

- `FairLossPredictionService`

Primary method:

- `simulate(finding, inputs)`

This service connects the lower-level FAIR modules together for individual findings. Scope-level FAIR uses `FairScopeLossPredictionService` to combine findings for business service, application, and asset views. It:

- builds the FAIR context from the selected finding and related asset
- injects security score maturity answers
- applies primary and secondary loss assumptions from the UI sliders
- runs `FrequencyEngine`
- runs `LM`
- runs `RiskEngine`
- converts the annual loss distribution into a chart-ready histogram

## Hierarchy Scoring Model

The app uses the same FAIR response shape at each level, but the meaning differs by layer.

### Finding Level

A finding is scored directly from one finding plus its asset context.

Finding TEF is calculated by `FrequencyEngine`:

```text
finding_tef = contact_frequency * probability_of_action
```

Contact frequency is driven by asset exposure and asset type. Probability of action is driven by EPSS and KEV. This means finding-level TEF represents how often that specific weakness is expected to receive relevant threat activity in one year.

Finding vulnerability is calculated from:

```text
threat capability vs resistance strength
```

Threat capability comes from EPSS and KEV. Resistance strength comes from the Security Score. Better security maturity raises resistance strength and lowers vulnerability.

Finding LEF is calculated by:

```text
finding_lef = finding_tef * vulnerability * escalation_probability
```

The finding-level model is the most direct FAIR calculation.

### Asset Level

An asset can have many findings, so asset TEF is not a sum of every finding TEF.

Bad rollup:

```text
asset_tef = finding_tef_1 + finding_tef_2 + ... + finding_tef_n
```

That double-counts the same attacker contact surface. Instead, the app treats findings as signals attached to one asset attack surface.

Current asset TEF formula:

```text
asset_tef =
    max(finding_tef)
    + median(finding_tef) * 0.25 * log(1 + finding_count)
```

This means:

- the strongest finding sets the baseline attacker activity
- many findings add breadth, but only logarithmically
- large finding counts do not scale TEF linearly

Asset vulnerability is a weighted average of finding vulnerabilities, weighted by modeled loss contribution. Asset LEF is then:

```text
asset_lef = asset_tef * asset_vulnerability * asset_material_loss_factor
```

Current asset material-loss factor:

```text
0.04
```

This factor is intentionally low because not every successful technical event becomes a material loss event.

### Application Level

Application TEF rolls up findings across assets under the application. It uses distinct asset count as the diversity measure, not raw finding count.

Current application TEF formula:

```text
application_tef =
    max(finding_tef)
    + median(finding_tef) * 3.0 * log(1 + distinct_asset_count)
```

Application LEF:

```text
application_lef =
    application_tef * application_vulnerability * application_material_loss_factor
```

Current application material-loss factor:

```text
0.06
```

Applications show TEF, LEF, vulnerability, and Security Score only. They do not ask the user for dollar loss assumptions.

### Business Service Level

Business service is the primary monetary FAIR layer. Applications, assets, and findings act as likelihood drivers, while the business service carries the financial impact scenario.

Current business-service TEF formula:

```text
business_service_tef =
    max(finding_tef)
    + median(finding_tef) * 8.0 * log(1 + distinct_asset_count)
```

Business-service LEF:

```text
business_service_lef =
    business_service_tef
    * business_service_vulnerability
    * business_service_material_loss_factor
```

Current business-service material-loss factor:

```text
0.08
```

If any scoped finding is KEV, the material-loss factor receives:

```text
+0.03
```

The material-loss factor is capped at:

```text
0.18
```

This keeps LEF from treating every successful technical event as a business-impacting loss event.

## Loss Scoring

Only the business-service layer presents monetary loss outputs.

The user supplies:

```text
primary_loss_mean
secondary_loss_mean
```

Primary loss represents direct response and recovery costs, such as:

- incident response labor
- forensic support
- remediation effort
- downtime recovery
- restoration work

Secondary loss represents downstream business impact, such as:

- revenue loss
- customer churn
- legal or regulatory exposure
- reputational impact

The backend samples a per-event loss magnitude distribution from those assumptions and combines it with the scope LEF distribution:

```text
annual_loss = scope_lef_distribution * loss_magnitude_distribution
```

The result is returned as:

```text
expected annual loss
P50
P90
P95
P99
worst modeled year
```

For presentation purposes, expected annual loss, P90, and P95 are more stable than worst modeled year. Worst modeled year is useful as an extreme simulation output but should not be presented as the most likely outcome.

## API Entry Points

File:

- `backend/app/api/findings.py`

Endpoint:

```http
POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/fair-loss
POST /topology/business-units/{business_unit_slug}/business-services/{business_service_slug}/applications/{application_slug}/fair-loss
POST /assets/{asset_id}/fair-loss
POST /findings/{finding_id}/fair-loss
```

The business-service endpoint:

1. loads the business service scope
2. selects the highest-risk findings under that service
3. runs annualized FAIR simulations for the selected findings
4. aggregates scope-level frequency and loss outputs
5. returns percentiles, means, Security Score, frequency estimates, and histogram points

Scope TEF is not calculated as a straight sum of finding TEFs. It starts with the strongest finding TEF and adds a logarithmic diversity bonus. Asset scopes use finding count for diversity; application and business-service scopes use distinct asset count. Findings therefore increase TEF through breadth, but large finding counts do not scale linearly.

Scope LEF is calculated from scope TEF, vulnerability, and a material-loss escalation factor. The escalation factor is intentionally much lower than a generic incident probability because not every successful technical event becomes a business loss event.

## Frontend Entry Point

Business-service pages display monetary FAIR loss exposure. Application, asset, and finding pages display likelihood indicators only: TEF, LEF, vulnerability, and Security Score.

## Important Data Shapes

The frontend sends nested control context:

```json
{
  "prevent": {
    "patch_maturity": 4,
    "mfa_maturity": 5,
    "segmentation_maturity": 3,
    "hardening_maturity": 4
  },
  "detect": {
    "logging_maturity": 3,
    "siem_maturity": 4,
    "speed_maturity": 3
  },
  "respond": {
    "plan_maturity": 4,
    "speed_maturity": 3,
    "automation_maturity": 2
  },
  "contain": {
    "edr_maturity": 4,
    "privilege_maturity": 3,
    "data_maturity": 5
  }
}
```

The backend flattens this for the existing control scorer:

```json
{
  "prevent_patch_maturity": 4,
  "prevent_mfa_maturity": 5,
  "prevent_segmentation_maturity": 3,
  "prevent_hardening_maturity": 4
}
```

## Current Assumptions

- Frequency outputs are annualized.
- Loss magnitude outputs are per loss event.
- Annual loss is calculated by combining scope-level LEF and LM distributions.
- Control maturity is normalized from `0-5` into `0-1`.
- The Security Score page stores local state in browser `localStorage` and also saves the current assessment to Supabase through the controls API.
- The current Supabase table is expected to be `control_assessments`.
