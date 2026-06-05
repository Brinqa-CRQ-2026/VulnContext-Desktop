# Frequency Engine

The frequency engine estimates annual threat and loss event frequency. Finding-level frequency is calculated directly. Asset, application, and business-service frequency are rollups built from finding-level outputs.

Backend files:

- `backend/app/services/fair/frequency/interface.py`
- `backend/app/services/fair/frequency/tef.py`
- `backend/app/services/fair/frequency/vulnerability.py`
- `backend/app/services/fair/frequency/lef.py`
- `backend/app/services/fair/controls/control_engine.py`

## Purpose

The frequency layer answers:

```text
How often should this scope create a business-impacting loss event in a year?
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

## Scope TEF Rollup

Finding-level TEF is accurate for a single finding, but it cannot be summed directly above the finding layer.

Example of what the app avoids:

```text
finding_1_tef = 20
finding_2_tef = 25
finding_3_tef = 30

bad_asset_tef = 20 + 25 + 30
```

That over-counts because the findings may share the same asset, service, network exposure, attacker population, and attack path.

The current rollup model is:

```text
scope_tef =
    max(finding_tef)
    + median(finding_tef) * breadth_multiplier * log(1 + diversity_count)
```

The constants are:

```text
asset breadth multiplier:            0.25
application breadth multiplier:      3.0
business service breadth multiplier: 8.0
```

Diversity count is:

```text
asset: finding count
application: distinct asset count
business service: distinct asset count
```

This produces a few useful behaviors:

- one highly exposed or attractive finding can dominate TEF
- many findings increase TEF, but not linearly
- applications and business services can have higher TEF because they span more assets
- low-risk services with many findings do not automatically explode into unrealistic TEF

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

- user security score
- inferred controls from context

If maturity answers are present, the user score is blended with inferred score. If not, the inferred score is used.

The security score answers enter the FAIR loss prediction through `control_context`.

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

## Scope LEF Rollup

Above the finding layer, LEF is not summed from every finding.

Current scope formula:

```text
scope_lef =
    scope_tef
    * scope_vulnerability
    * material_loss_factor
```

Scope vulnerability is a weighted average of finding vulnerabilities. The weighting uses each finding's modeled loss contribution so higher-impact findings influence the rollup more than low-impact findings.

Material-loss factor represents the chance that a successful technical event becomes a business-impacting loss event. It is intentionally much lower than a generic incident probability.

Current material-loss factors:

```text
asset:            0.04
application:      0.06
business service: 0.08
KEV bonus:       +0.03
cap:              0.18
```

So, for a business service:

```text
business_service_lef =
    business_service_tef
    * business_service_vulnerability
    * 0.08
```

If any scoped finding is KEV:

```text
business_service_lef =
    business_service_tef
    * business_service_vulnerability
    * 0.11
```

This distinction matters. TEF can represent many threat contacts, scans, probes, or exploit opportunities, while LEF should represent material loss events per year.

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
