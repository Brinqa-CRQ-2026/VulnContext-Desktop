# Scoring And Prioritization

This is the sponsor-facing explanation of VulnContext scoring. It focuses on
how the scoring model helps an organization decide what to fix first.

For the full implementation reference, see
[CRQ Scoring And Rollups](../scoring/crq-scoring-and-rollups.md).

## The Core Idea

Vulnerability severity alone is not enough for remediation planning. A severe
finding on a low-context internal system may be less urgent than a slightly
lower severity finding on a public production system that supports a critical
business service.

The CRQ model combines:

- vulnerability severity
- exploitability evidence
- known exploitation in the wild
- asset exposure
- data sensitivity
- environment importance
- application concentration
- business service criticality

The result is a scoring system that prioritizes actual business risk instead of
only ranking findings by CVSS.

## How Scores Roll Up

Two scores propagate through the topology:

- risk measures technical and topology-driven exposure
- priority measures remediation urgency by combining technical risk, asset
  context, and business impact

Both scores can be viewed through the same hierarchy:

```text
Finding
  -> Asset
  -> Application
  -> Business Service
  -> Business Unit
  -> Company
```

Each layer adds the context it owns:

| Layer | What it adds | What the score helps answer |
| --- | --- | --- |
| Finding | CVSS, EPSS, KEV | How dangerous is this vulnerability by itself? |
| Asset | Exposure, sensitivity, environment, asset type | How important is the affected system context? |
| Application | Risk across supporting assets, PCI/PII tags | How much risk is concentrated in this application? |
| Business Service | Application risk, direct asset risk, criticality | Which services carry business impact? |
| Business Unit | Average service risk and priority | Which portfolios have the highest risk and urgency? |

## Risk Versus Priority

The model separates risk from priority.

Risk is the technical and topology-driven exposure:

- vulnerable findings
- risky assets
- risky applications
- risky services

Priority adds remediation urgency:

- a dangerous vulnerability matters
- a dangerous vulnerability on an exposed, important asset matters more
- a dangerous vulnerability that supports a critical business service matters
  most

This separation keeps the scoring explainable. A team can see whether work is
urgent because the finding is technically risky, the asset has important
context, the business service is critical, or all three are true.

## Unified Remediation Priority

The Unified Remediation Priority Score combines vulnerability risk, asset
context, and business criticality into a single score used to rank remediation
work.

Unlike traditional vulnerability management platforms that prioritize primarily
by severity, VulnContext incorporates technical risk, exposure, asset
importance, and business impact to ensure remediation efforts are focused on the
vulnerabilities that pose the greatest risk to the organization.

```text
priority score =
  60% finding risk
+ 20% asset context
+ 20% business criticality
```

Business criticality is normalized from `0-5` to `0-10` before it is used:

```text
normalized business criticality = (business criticality / 5) * 10
```

Example:

```text
Finding risk = 9.0
Asset context = 8.5
Business criticality = 5 / 5 = 10

Priority =
  (0.60 * 9.0)
+ (0.20 * 8.5)
+ (0.20 * 10)
= 9.1
```

Risk answers: how dangerous is this vulnerability?

Priority answers: if only one thing can be fixed today, what should it be?

This finding-level priority score is the intended company-wide remediation
ranking signal. It lets the product sort all findings across the company by one
score that already includes context from the finding, the affected asset, and
the business service.

Implementation status: this methodology is documented as the target model for
finding-level remediation ranking. The current backend does not yet fully
persist or calculate a unified finding priority score.

## Business Service Priority

Business service priority is the currently implemented service-level priority
score. It ties technical service risk to business importance.

```text
business service priority = 70% service risk + 30% business criticality
```

The `70/30` split keeps real technical risk as the primary driver while allowing
critical business services to rise in the remediation queue.

If business criticality is missing, priority falls back to the service risk
score. This avoids inventing business importance when the data is not available.

This service-level score remains useful for portfolio views. Future scoring work
should align it with the unified priority model so finding, asset, application,
service, business unit, and company priority all answer the same question: what
should be fixed first?

## Why Context Does Not Create Risk By Itself

Asset and application context can increase urgency, but only when vulnerabilities
exist. A critical production system with no scored findings should not become
high risk simply because it is important.

That is why context works as a bounded multiplier. It can preserve more of the
finding-driven risk for important systems, but it does not create risk from
nothing.

## Why Volume Is Bounded

The model uses log scaling for finding and asset burden. This means volume
matters, but it has diminishing returns.

Without this, a system with many low-risk findings could outrank a system with a
small number of serious, exploitable findings. The model avoids that by giving
severity and concentration more influence than raw count alone.

## Current Adoption-Relevant Outputs

| Output | What it means |
| --- | --- |
| Finding score | Vulnerability severity plus exploitability evidence |
| Unified remediation priority score | Finding risk plus asset context and business criticality; target model, not fully implemented yet |
| Asset risk score | Finding pressure adjusted by asset context |
| Application risk score | Risk concentration across supporting assets |
| Business service risk score | Risk across applications and direct service assets |
| Business service priority score | Business service risk plus business criticality |
| Business unit risk score | Portfolio average of business service risk |
| Business unit priority score | Portfolio average of business service priority |

Company-level scoring is not implemented yet. The proposed simple formula is:

```text
company risk = average business unit risk
company priority = average business unit priority
```

This keeps the company score explainable and avoids introducing a separate
company weighting model before the underlying company fields are implemented.

## What Sponsors Should Evaluate

Sponsors should focus on these adoption questions:

- Does the model prioritize business services instead of isolated findings?
- Does unified priority clearly rank all findings across the company?
- Are the scoring inputs explainable to security and business stakeholders?
- Does priority clearly separate technical risk from business criticality?
- Are missing data cases handled conservatively and transparently?
- Is company-level scoring needed for the first adoption milestone, or is
  business-unit and business-service priority enough?

## Current Documentation Gap

The largest adoption-level gap is implementation of unified finding-level
priority. The methodology is now defined, but the backend still needs scoring,
storage, API, and UI work before it becomes the active remediation ranking
signal.

The remaining company-level gap is implementation, not methodology. The proposed
company scores should stay simple:

- company risk should average business unit risk
- company priority should average business unit priority
