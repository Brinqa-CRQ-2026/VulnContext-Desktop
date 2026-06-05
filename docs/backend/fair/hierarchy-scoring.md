# FAIR Hierarchy Scoring

This document explains how FAIR metrics are scored at each hierarchy layer.

## Summary

The app uses this hierarchy:

```text
Finding -> Asset -> Application -> Business Service
```

The key rule is:

```text
Findings drive likelihood.
Assets and applications aggregate likelihood.
Business services carry monetary loss exposure.
```

This prevents the model from saying every finding owns its own independent business loss.

## Finding

Finding-level FAIR is the direct calculation.

Inputs:

- asset exposure score
- asset type score
- asset sensitivity and environment
- EPSS
- KEV
- Security Score

Finding TEF:

```text
finding_tef = contact_frequency * probability_of_action
```

Finding vulnerability:

```text
vulnerability = P(threat capability > resistance strength)
```

Finding LEF:

```text
finding_lef = finding_tef * vulnerability * escalation_probability
```

Finding outputs are useful for likelihood explanation, not for assigning dollars to a single vulnerability.

## Asset

An asset can have many findings, but those findings often share the same attack surface. Asset TEF is therefore not a sum.

Current formula:

```text
asset_tef =
    max(finding_tef)
    + median(finding_tef) * 0.25 * log(1 + finding_count)
```

Asset vulnerability:

```text
asset_vulnerability = weighted average of finding vulnerabilities
```

Asset LEF:

```text
asset_lef = asset_tef * asset_vulnerability * 0.04
```

If any scoped finding is KEV:

```text
asset_lef = asset_tef * asset_vulnerability * 0.07
```

Asset pages display TEF, LEF, vulnerability, and Security Score only.

## Application

Applications roll up across assets. Diversity is distinct asset count, not finding count.

Current formula:

```text
application_tef =
    max(finding_tef)
    + median(finding_tef) * 3.0 * log(1 + distinct_asset_count)
```

Application vulnerability:

```text
application_vulnerability = weighted average of finding vulnerabilities
```

Application LEF:

```text
application_lef = application_tef * application_vulnerability * 0.06
```

If any scoped finding is KEV:

```text
application_lef = application_tef * application_vulnerability * 0.09
```

Application pages display TEF, LEF, vulnerability, and Security Score only.

## Business Service

Business service is the main monetary FAIR layer.

Current formula:

```text
business_service_tef =
    max(finding_tef)
    + median(finding_tef) * 8.0 * log(1 + distinct_asset_count)
```

Business-service vulnerability:

```text
business_service_vulnerability = weighted average of finding vulnerabilities
```

Business-service LEF:

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

The material-loss factor is capped at:

```text
0.18
```

Business service pages display monetary loss because this is the layer where business impact assumptions are most defensible.

## Why Not Sum TEF?

If an asset has 100 findings and each finding has TEF around 20-30/year, summing would produce:

```text
100 * 25 = 2500 threat events/year
```

That is usually wrong because the findings may share:

- the same asset
- the same exposed service
- the same attacker population
- the same exploit path
- the same business scenario

The current model uses:

```text
max + median * log diversity
```

This lets many findings increase risk without making finding count the main driver.

## Business Criticality

Business criticality should mostly affect loss magnitude, not TEF.

High criticality does not automatically mean attackers contact the service more often. It means the organization loses more when the service is disrupted, compromised, or exposed.

In the current UI, the user controls loss magnitude through:

```text
primary_loss_mean
secondary_loss_mean
```

Future improvement: use business criticality to suggest default primary and secondary loss ranges.

## Interpretation

TEF means:

```text
modeled threat contact events or exploit opportunities per year
```

LEF means:

```text
modeled material loss events per year
```

Expected annual loss means:

```text
average simulated annual loss after combining LEF with loss magnitude
```

P90/P95 mean:

```text
high-loss annual outcomes from the simulation
```

Worst modeled year is an extreme simulation result and should be treated as stress-test context, not the expected outcome.
