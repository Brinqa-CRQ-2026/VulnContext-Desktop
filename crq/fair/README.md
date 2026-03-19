# FAIR Monte Carlo Risk Engine

This package implements a probabilistic FAIR (Factor Analysis of Information) model using Monte Carlo simulation.

The engine models cyber risk as:

    Risk = Loss Event Frequency x Loss Magnitude

All outputs are annualized.

# Model Overview

The engine implements the following structure:
1) Contact Frequency
2) Probability of Action
3) Threat Event Frequency
4) Vulnerability
5) Escalation Probability
6) Loss Event Frequency
7) Loss Magnitude
9) Annual Risk

Mathematically:
    LEF = Poisson(CF x PoA x Vulnerability x Escalation)
    LM = Primary + Secondary
    Annual Risk = LEF x LM

All components are modeled using Monte Carlo simulation.

# Package Structure

```
fair/
├── frequency/
│ ├── tef.py
│ ├── vulnerability.py
│ ├── lef.py
│ └── interface.py
│
├── magnitude/
│ └── lm.py
│
└── risk_engine.py
```

# Frequency Module

Models annualized Loss Event Frequency.

Components:

- TEF: Poisson(CF x PoA)
- Vulnerability: P(TCap > Resistance Strength)
- Escalation: Probability exploit escalates to business-impact event

Output:

- Annual loss event frequency distribution

LEF represents business-impacting loss events, not exploit attempts

# Magnitude Module

Models loss per loss event.

Components:

- Primary Loss (LogNormal)
- Secondary Trigger (Bernoulli)
- Secondary Magnitude (LogNormal)

Output:

- Loss per event distribution

# Risk Engine

Combines frequency and magnitude:

    Annual Risk = LEF x LM

Monte Carlo elementwise multiplication preserves distributional behavior.

Outputs:

- Expected annual loss
- Full distribution
- Risk percentiles (P90, P95, etc.)

# Modeling Assumptions

- All frequency values are annual
- Heavy-tailed behavior is modeled using LogNormal distributions
- Event progression uses Poisson thinning
- Escalation progression uses Poisson thinning.
- Escalation converts technical exploit success into business-impact events
- Primary and secondary losses are conditionally independent
- Monte Carlo sampling preserves distribution shape across the pipeline