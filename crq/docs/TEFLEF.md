# Threat Event Frequency (TEF)
Threat Event Frequency is the probable frequency, within a given timeframe, that a threat agent will act against an asset:\
$TEF = ContactFrequency * ProbabilityOfAction$
\
Contact Frequency: How often threat agents come into contact with the asset
- internet scanning bots hitting web server
- phishing emails reaching employees
- Internal users accessing a database

Probability of Action: Given contact occurs, what is the probability that threat agent takes malicious action
- bot scans port 80 — does it attempt exploitation?
- an employee receives phishing email — do they click?

## Ways to calculate TEF
### Internal Telemetry
This is the best way but likely unavailable
- WAF logs
- IDS logs
- Firewall logs
- Brute force attempts counts
- exploit attempt signatures
In this case:\
$TEF = \text{Observed malicious attempts per year}$

### Exposure-Based Parametric Model
$\lambda = BaseRate * ExposureMultiplier * AssetMultiplier$
\
BaseRate = baseline attempts/year
ExposureMultiplier = internet exposure effect
AssetMultiplier = asset type sensitivity
\
$TEF = Poisson(\lambda)$

### FAIR Decomposition
$TEF = ContactFrequency * ProbabilityOfAction$

# Loss Event Frequency (LEF)
Loss Event Frequency is the probable frequency, within a given timeframe, that a threat action results in loss.\
$LEF =TEF * Vulnerability$

## Stochastic LEF
$LEF_i = TEF_i * Vulnerability$
\
Variation propagates into financial loss distribution

## Monte Carlo Simulation
Repeat the entire risk process thousands of times with randomness included. Each iteration represents a simulated year of risk.\
For iteration i:
1) Sample $TEF_i$ from $Poisson(\lambda)$
2) compute $LEF_i$
3) Sample $LossPerEvent_i$ from loss distribution
4) Compute $AnnualLoss_i = LEF_i * LossPerEvent_i$

Repeat thousands of times and obtain a distribution of annual losses.

We use Monte Carlo Because risk is uncertain:
- captures variance
- produces full loss distribution
- allows VaR, CVaR, tail analysis

## Poisson Thinning

$TEF ~ Poisson(\lambda)$
\
then,\
$LEF ~ Poisson(\lambda * V)$

# Loss Per Event
Loss Magnitude: The probable loss resulting from a loss event
- primary loss
    * incident response
    * forensics
    * downtime
    * revenue interruption
    * data restoration
- secondary loss
    * legal fees
    * regulatory fines
    * brand damage
    * customer chum
    * lawsuits

## If there is provided data, use Internal Historical Data/Industry Reports
- past breach costs
- IR spend
- downtime cost logs
- insurance claims

Another option is Scenario-based-modeling\
$Loss = DowntimeCost + IRCost + Legal + Notification + RevenueLoss$

## If there is no internal data, use parametric distribution
$Loss_{event} ~ LogNormal(\mu, \sigma)$

Calibrating LogNormal
- suppose you have average and median breach cost
- Median = $e^{\mu}$
- Mean = $e^{\mu + \frac{\sigma^2}{2}}$

# Outputs
Annualized Loss Expectancy (ALE): mean(AnnualLoss)
Value at Risk (VaR)
- $VaR_{95}$
- 95% of years have loss below this amount
CVaR (Expected Shortfall)
- $CVaR_{95}$
- If we are in the worst 5% of years, what is the average loss
Full Distribution Shape
- rare extreme years
- loss clustering
- variance


https://www.fairinstitute.org/blog/fair-risk-terminology-vulnerability-is-susceptibility-the-open-group-says

https://www.opengroup.org/open-fair

https://www.fairinstitute.org/blog/fair-terminology-101-risk-threat-event-frequency-and-vulnerability