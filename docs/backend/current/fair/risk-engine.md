# Risk Engine

The risk engine combines annual loss event frequency with per-event loss magnitude to produce an annualized loss distribution.

Backend file:

- `backend/app/services/fair/risk_engine.py`

Orchestrator:

- `backend/app/services/fair/loss_prediction.py`

Frontend display:

- `frontend/src/components/dashboard/FindingDetailPage.tsx`

## Purpose

The risk engine answers:

```text
What is the annualized loss distribution for this finding?
```

It combines:

- LEF distribution from `FrequencyEngine`
- LM distribution from `LM`

Formula:

```text
Annual Loss = LEF * LM
```

## Correlation Handling

`RiskEngine.simulate()` accepts:

```python
rho: float = 0.5
```

It rank-blends loss magnitude samples against LEF samples so frequency and magnitude are not treated as fully independent. Higher LEF scenarios are partially associated with larger magnitude scenarios.

The current implementation:

1. sorts/ranks LEF
2. sorts LM
3. blends LEF ranks with random ranks
4. selects correlated LM samples
5. multiplies LEF and correlated LM

## Outputs

The backend risk output includes:

```text
risk_mean
risk_distribution
risk_p50
risk_p90
risk_p95
risk_p99
max_loss
lef_mean
lm_mean
```

The `FairLossPredictionService` maps these into API fields:

```text
loss_mean
loss_p50
loss_p90
loss_p95
loss_p99
worst_loss
histogram
```

## Histogram

The frontend chart does not receive every Monte Carlo sample. Instead:

- the backend clips the distribution at P99 for chart stability
- bins the distribution into histogram points
- returns `{ loss, probability }` points

This chart data is rendered in Recharts as an area chart.

## Frontend Display

The Finding detail page displays:

- P50 / median
- P90
- P95
- P99
- worst simulated loss
- mean annual loss
- LEF mean
- TEF mean
- control score
- vulnerability

Changing either magnitude slider triggers a new backend simulation and updates the graph and summary values.
