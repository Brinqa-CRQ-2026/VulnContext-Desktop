# Frequency Engine

The frequency engine estimates annual loss event frequency for a finding.

Backend files:

- `backend/app/services/fair/frequency/interface.py`
- `backend/app/services/fair/frequency/tef.py`
- `backend/app/services/fair/frequency/vulnerability.py`
- `backend/app/services/fair/frequency/lef.py`
- `backend/app/services/fair/controls/control_engine.py`

## Purpose

The frequency layer answers:

```text
How often should this finding create a business-impacting loss event in a year?
```

It is not just exploit attempts. It converts threat activity into loss events by accounting for:

- exposure
- EPSS
- KEV status
- control strength
- escalation probability

## Pipeline

```text
Asset exposure + asset type + EPSS + KEV
        |
        v
TEF
        |
        v
Vulnerability using ControlEngine
        |
        v
Escalation probability
        |
        v
LEF distribution
```

## TEF

File:

- `tef.py`

Threat Event Frequency combines:

- contact frequency
- probability of action

Contact frequency is driven by:

- `crq_asset_exposure_score`
- `crq_asset_type_score`

Probability of action is driven by:

- `epss`
- `is_kev`

Outputs include:

- `cf_mean`
- `poa_mean`
- `lambda_mean`
- `tef_mean`
- `lambda_distribution`
- `tef_distribution`

## Vulnerability

File:

- `vulnerability.py`

Vulnerability estimates:

```text
P(threat capability > resistance strength)
```

It uses:

- EPSS and KEV to model threat capability
- `ControlEngine` to compute control score
- resistance strength samples derived from control score

Control score enters here. Better controls increase resistance strength and reduce vulnerability.

Outputs:

- `vulnerability`
- `control_score`

## ControlEngine

Files:

- `controls/control_engine.py`
- `controls/control_scoring.py`
- `controls/control_inference.py`

`ControlEngine` blends:

- user questionnaire score
- inferred controls from context

If maturity answers are present, the user score is blended with inferred score. If not, the inferred score is used.

The questionnaire answers enter the FAIR loss prediction through `control_context`.

## LEF

File:

- `lef.py`

Loss Event Frequency converts successful exploit pressure into business-impacting loss events:

```text
lambda_success = lambda_samples * vulnerability
lambda_loss = lambda_success * escalation_prob
loss_events = Poisson(lambda_loss)
```

Outputs:

- `lef_mean`
- `lef_distribution`
- `lambda_loss_mean`

## FrequencyEngine

File:

- `interface.py`

This is the public entry point for frequency simulation. It:

1. runs TEF
2. computes vulnerability
3. derives escalation probability
4. runs LEF
5. returns all frequency outputs plus control score

The FAIR loss prediction endpoint uses this through:

- `backend/app/services/fair/loss_prediction.py`
