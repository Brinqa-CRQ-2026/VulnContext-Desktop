# FAIR Pipeline Overview

The FAIR pipeline estimates annualized loss for a finding by combining:

1. control maturity
2. threat event frequency
3. vulnerability
4. loss event frequency
5. loss magnitude
6. annual loss simulation

At a high level:

```text
Controls questionnaire
        |
        v
Nested control answers
        |
        v
Control score
        |
        v
Finding + asset context + EPSS + KEV
        |
        v
FrequencyEngine -> LM -> RiskEngine
        |
        v
Annual loss distribution + P50/P90/P95/P99/worst loss
        |
        v
Finding detail UI chart and summary stats
```

## Main Backend Orchestrator

File:

- `backend/app/services/fair/loss_prediction.py`

Primary class:

- `FairLossPredictionService`

Primary method:

- `simulate(finding, inputs)`

This service connects the lower-level FAIR modules together. It:

- builds the FAIR context from the selected finding and related asset
- injects questionnaire control maturity answers
- applies primary and secondary loss assumptions from the UI sliders
- runs `FrequencyEngine`
- runs `LM`
- runs `RiskEngine`
- converts the annual loss distribution into a chart-ready histogram

## API Entry Point

File:

- `backend/app/api/findings.py`

Endpoint:

```http
POST /findings/{finding_id}/fair-loss
```

The endpoint:

1. loads the finding by `finding_id`
2. joins the related asset
3. passes request assumptions to `FairLossPredictionService`
4. returns percentiles, means, control score, frequency estimates, and histogram points

## Frontend Entry Point

File:

- `frontend/src/components/dashboard/FindingDetailPage.tsx`

Component:

- `LossPredictionPanel`

The panel:

- shows a `Generate Predicted Loss` action
- reads the saved local questionnaire context
- converts it to nested domain JSON
- sends primary and secondary loss mean slider values
- renders the returned histogram with Recharts
- displays P50, P90, P95, P99, worst loss, LEF, TEF, control score, and vulnerability

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
- Annual loss is calculated by combining LEF and LM distributions.
- Control maturity is normalized from `0-5` into `0-1`.
- The Controls page currently stores local state in browser `localStorage` and also saves the current assessment to Supabase through the controls API.
- The current Supabase controls table is expected to be `control_assessments`.
