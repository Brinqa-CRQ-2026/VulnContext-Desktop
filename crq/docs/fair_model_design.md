# Final FAIR Risk Modeling Pipeline

This document outlines the complete quantitative risk modeling pipeline integrating EPSS with FAIR principles and Monte Carlo simulation.

---

## 1. Inputs

### Security Signals
- EPSS (30-day probability)
- Asset metadata:
  - `internet_exposed`
  - `asset_type`
  - `service`
  - `criticality`
  - patch age / control indicators

---

## 2. Compute FAIR Vulnerability

### Step 2.1 — Annualize EPSS

Convert 30-day EPSS probability into annual probability:

$$
P_{annual} = 1 - (1 - EPSS)^{12}
$$

This assumes independence between months.

---

### Step 2.2 — Adjust for Asset Context

$$
V = P_{annual} \times ExposureFactor \times ControlFactor
$$

Where:

- ExposureFactor (0–1) = how reachable the asset is  
- ControlFactor (0–1) = how effective defensive controls are  

This produces:

Vulnerability (V) = Probability an attack attempt succeeds.

---

## 3. Model Threat Event Frequency (TEF)

### Step 3.1 — Estimate TEF Rate (λ)

Using exposure-based parametric model:

$$
\lambda = BaseRate \times ExposureMultiplier \times AssetMultiplier
$$

Where:
- BaseRate = baseline attempts per year
- ExposureMultiplier = internet exposure effect
- AssetMultiplier = asset type sensitivity

---

### Step 3.2 — Apply Poisson Modeling

$$
TEF \sim Poisson(\lambda)
$$

TEF represents the number of attack attempts per year.

---

## 4. Compute Loss Event Frequency (LEF)

### Expected LEF

$$
LEF = \lambda \times V
$$

This represents the expected successful loss events per year.

---

### Poisson Thinning (Stochastic LEF)

Using Poisson thinning:

$$
SuccessfulEvents \sim Poisson(\lambda \times V)
$$

This directly models the number of successful attack events resulting in loss.

---

## 5. Aggregate Across Vulnerabilities (Per Asset)

If an asset has multiple vulnerabilities:

$$
\lambda_{asset} = \sum (\lambda_i \times V_i)
$$

Then:

$$
SuccessfulEvents_{asset} \sim Poisson(\lambda_{asset})
$$

This properly aggregates risk across multiple vulnerabilities.

---

## 6. Model Loss Magnitude (Per Event)

### If Internal or Industry Data Exists

Use:
- Historical breach costs
- Incident response data
- Industry breach reports

---

### If No Direct Data (Prototype Approach)

Use parametric distribution:

$$
Loss_{event} \sim LogNormal(\mu, \sigma)
$$

Calibration:

- Median = $e^\mu$
- Mean = $e^{\mu + \frac{\sigma^2}{2}}$

Loss magnitude may vary by asset type or criticality.

---

## 7. Monte Carlo Simulation

Run N iterations (e.g., 10,000).

For each simulated year:

1. Sample:
   $$
   SuccessfulEvents \sim Poisson(\lambda_{asset})
   $$

2. For each successful event:
   - Sample $Loss_j \sim Distribution$

3. Compute:
   $$
   AnnualLoss = \sum_{j=1}^{SuccessfulEvents} Loss_j
   $$

Store `AnnualLoss` for each iteration.

---

## 8. Risk Outputs

From the simulated AnnualLoss distribution:

### Annualized Loss Expectancy (ALE)

$$
ALE = mean(AnnualLoss)
$$

Expected average annual loss.

---

### Value at Risk (VaR)

- $VaR_{95}$
- $VaR_{99}$

Interpretation:

The maximum loss not exceeded with 95% (or 99%) confidence.

---

### Conditional Value at Risk (CVaR)

- $CVaR_{95}$

Interpretation:

Average loss in the worst 5% of years.

---

### Full Distribution Characteristics

- Heavy tail behavior
- Rare extreme years
- Loss clustering
- Variance and skew

---

## Key Modeling Assumptions

- Monthly EPSS independence
- Poisson arrival process for attack attempts
- Independent event severity
- No cross-asset correlation (prototype assumption)

These assumptions should be documented and refined in future iterations.

---

## Conceptual Summary

$$
EPSS \rightarrow Vulnerability \rightarrow TEF \rightarrow LEF \rightarrow LossMagnitude \rightarrow MonteCarlo \rightarrow RiskMetrics
$$

This pipeline produces a full financial risk distribution, not a single risk score.
