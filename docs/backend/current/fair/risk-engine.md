# Risk Engine

The risk engine combines annual loss event frequency with per-event loss magnitude to produce an annualized loss distribution.

Backend file:

- `backend/app/services/fair/risk_engine.py`

Orchestrator:

- `backend/app/services/fair/loss_prediction.py`

Frontend display:

- `frontend/src/components/business-services/BusinessServiceDetailPage.tsx`
- `frontend/src/components/fair/FairScopeLossPanel.tsx`

## Purpose

The risk engine answers:

```text
What is the annualized loss distribution for this business service?
```

It combines:

- LEF distribution from `FrequencyEngine`
- LM distribution from `LM`

Formula:

```text
Annual Loss = LEF * LM
```

In the current hierarchy, monetary annual loss is shown only at the business-service layer. Finding, asset, and application views show frequency indicators only.

## Current Business-Service Flow

The business-service FAIR flow is:

```text
finding TEF/LEF simulations
        |
        v
scope TEF rollup using max + diversity bonus
        |
        v
scope LEF = TEF * vulnerability * material-loss factor
        |
        v
loss magnitude sampling from primary/secondary means
        |
        v
annual loss distribution
```

This prevents finding count from directly multiplying annual loss. Findings affect the rollup through threat opportunity breadth and vulnerability, while the business service supplies the monetary impact assumptions.

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

The business-service FAIR panel displays:

- expected annual loss
- P90 annual loss
- P95 annual loss
- worst modeled year
- TEF mean
- LEF mean
- Security Score
- vulnerability
- primary and secondary loss mean sliders

Changing either magnitude slider triggers a new backend simulation and updates the summary values.

## Interpretation

Expected annual loss is the most stable executive-facing number.

P90 and P95 answer:

```text
How bad could a high-loss year be?
```

Worst modeled year is an extreme Monte Carlo sample. It can be useful for stress-testing, but it is less stable and more likely to distract than expected annual loss, P90, or P95.
