# Frequency Engine

This module implements the full **FAIR Loss Event Frequency (LEF)** pipeline using Monte Carlo simulation

# Model Overview

The frequency module computes:

LEF = Poisson(CF x PoA x V x E)

Where:

- CF = Contact Frequency
- PoA = Probability of Action
- Vulnerability (P[TCap > Rs])
- E = Escalation Probability

The final LEF represents the Annual frequency of business-impacting loss events (not just exploit attempts).

# Module Structure

## tef.py - Threat Event Frequency

Implements:

TEF = Poisson(CF x PoA)

### Contact Frequency (CF)

Derived from:
- Internet Exposure
- Asset Type
- Service Type

CF is modeled as LogNormal

### Probability of Action (PoA)

Derived from:
- EPSS score (annualized exploit probability)

PoA is modeled as Beta-distributed

### Output

Returns:
- lambda_distribution
- tef_distribution
- summary statistics

## vulnerability.py - Vulnerability

Implements:

V = P(TCap > RS)

Where:

- TCap = Threat Capability (LogNormal)
- RS = Resistance Strength (LogNormal)

Monte Carlo sampling estimates the probability that attacker capability exceeds defensice resistance.

Output:
- Scalar vulnerability probability in [0, 1]

## lef.py - Loss Event Frequency

Implements:

LEF = Poisson(CF x PoA x V x E)

### Escalation

Escalation probability models the probability that a successful exploit results in business-impacting loss. Escalation represents containment failure, lateral movements, or business impact materialization. Final loss events are sampled via Poisson thinning.

Output:
- lef_distribution
- lef_mean
- lambda_loss_mean

## interface.py

Provides a clean entry point for running the full frequency simulation.

Responsibilities:
- Accept structured business context
- Derive statistical parameters
- Run TEF
- Compute vulnerability
- Derive escalation
- Produce final LEF distribution

# Modeling Assumptions
- All frequency outputs are annual
- LogNormal distributions model heavy-tailed behavior
- Beta distributions model exploit probability uncertainty
- Poisson thinning models conditional event progression
- Escalation converts technical exploit success into true loss events