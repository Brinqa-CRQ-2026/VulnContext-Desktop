# Magnitude Engine

The magnitude engine estimates loss amount per loss event.

Backend file:

- `backend/app/services/fair/magnitude/lm.py`

Frontend file:

- `frontend/src/components/dashboard/FindingDetailPage.tsx`

## Purpose

The magnitude layer answers:

```text
If a loss event happens, how large is the financial loss?
```

It models per-event loss, not annualized loss. Annualization happens later in `RiskEngine`.

## Loss Components

```text
Loss Magnitude = Primary Loss + Secondary Loss
```

Primary loss examples:

- incident response work
- downtime
- recovery
- forensics
- productivity impact

Secondary loss examples:

- legal cost
- regulatory penalties
- reputational harm
- customer churn

## UI Sliders

The Finding detail FAIR panel has two sliders:

- Primary mean
- Secondary mean

These values are sent to the backend as:

```json
{
  "primary_loss_mean": 50000,
  "secondary_loss_mean": 15000
}
```

## Backend Behavior

`LM.simulate(context)` reads:

- `primary_loss_mean`
- `secondary_loss_mean`
- optional `primary_sigma`
- optional `secondary_sigma`

If `primary_loss_mean` is provided, the model samples primary loss from a lognormal distribution centered around that requested mean.

If `secondary_loss_mean` is provided, the model:

1. derives a trigger probability from asset sensitivity and environment
2. converts the requested realized secondary mean into a conditional mean
3. samples secondary trigger events
4. samples secondary magnitude
5. multiplies trigger by magnitude

This keeps secondary loss conditional, while still letting the slider control the realized expected secondary amount.

## Outputs

The magnitude engine returns:

```text
lm_mean
lm_distribution
primary_mean
secondary_mean
```

These outputs are passed to `RiskEngine`.

## Relationship To Asset Context

If explicit slider means are not present, the legacy/default path derives loss from:

- `service_value`
- `crq_asset_data_sensitivity_score`
- `crq_asset_environment_score`
- `crq_asset_type_score`
- `downtime_days_mean`

In the current frontend FAIR panel, the slider values are the main magnitude controls.
