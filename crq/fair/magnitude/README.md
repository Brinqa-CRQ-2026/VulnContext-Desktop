# Magnitude Module

This module implements the Loss Magnitude component of the FAIR risk model.

It models the financial impact per business-impacting loss event using Monte Carlo simluation.

# Module Overview

Loss Magnitude is structures as:

LM = Primary Loss + Secondary Loss

Where:
- Primary Loss = Direct internal costs
- Secondary Loss = External reaction costs (conditional)

All outputs represent loss per event (not annualized).

# lm.py

The LossMagnitude class performs Monte Carlo simluation of loss per event.

It models:

1. Primary Loss using a LogNormal distribution
2. Secondary Loss using:
    - A Bernoulli trigger probability
    - A LogNormal magnitude distribution

# Primary Loss

Primary losses include:

- Incident response labor
- Downtime
- Forensics
- System rebuild
- Productivity loss

Modeled as:

Primary ~ LogNormal(mean, sigma)

# Secondary Loss

Secondary losses include:

- Regulatory fines
- Legal settlements
- Customer churn
- Reputational damage

Modeled as:

SecondaryTrigger ~ Bernoulli(p)

SecondaryMagnitude ~ LogNormal(mean, sigma)

SecondaryLoss = SecondaryTrigger x SecondaryMagnitude

Not all events trigger secondary loss.

# Total Loss Per Event

TotalLoss = PrimaryLoss + SecondaryLoss

Each Monte Carlo iteration represents one possible loss amount for one loss event.

# Outputs

simulate() returns:
- lm_distribution - distribution of loss per event
- lm_mean - expected loss per event
- primary_mean - expected primary loss
- secondary_mean - expected realized secondary loss