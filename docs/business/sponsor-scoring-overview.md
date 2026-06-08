# Sponsor Scoring Overview

This is the sponsor and Brinqa-facing overview of Cyber Risk Quantification
(CRQ). It focuses on how CRQ uses available vulnerability, asset, compliance,
and topology data to decide what should be fixed first.

For the full implementation reference, see
[Technical Scoring Reference](../scoring/technical-scoring-reference.md).

## The Core Idea

Vulnerability severity alone is not enough for remediation planning. A severe
finding on a low-context internal system may be less urgent than a slightly
lower severity finding on a public production system that supports a critical
business service.

CRQ combines:

- vulnerability severity
- exploitability evidence
- known exploitation in the wild
- asset context, calculated from exposure, data sensitivity, environment, and
  asset type
- application concentration
- business service criticality

The result is a scoring model that prioritizes practical cyber risk instead of
only ranking findings by CVSS.

## How Scores Roll Up

Risk propagates through the business topology:

```text
Finding
  -> Asset
  -> Application
  -> Business Service
  -> Business Unit
  -> Company View
```

Each layer adds the context it owns:

| Layer | What it adds | What the score helps answer |
| --- | --- | --- |
| Finding | CVSS, EPSS, KEV | How dangerous is this vulnerability by itself? |
| Asset | Asset criticality score calculated from exposure, sensitivity, environment, and asset type | How risky is this affected asset context? |
| Application | Risk across supporting assets, PCI/PII tags | How much risk is concentrated in this application? |
| Business Service | Application risk, direct asset risk, service criticality | Which services carry business impact? |
| Business Unit | Average service risk | Which portfolios have the highest risk? |
| Company View | Cross-portfolio visibility | Where should leadership focus review? |

## Unified Remediation Priority

Unified remediation priority is the finding-level ranking score. It combines
the vulnerability, affected asset, and business context into one remediation
queue.

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

This finding-level priority score is the intended remediation ranking signal.
It lets CRQ sort findings by one score that already includes context from the
finding, the affected asset, and the business service.

## Why Context Does Not Create Risk By Itself

Asset, application, and business context can increase urgency, but only when
vulnerabilities exist. A critical production system with no scored findings
should not become high risk simply because it is important.

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
| Unified remediation priority score | Finding risk plus asset context and business criticality |
| Asset criticality score | Aggregated asset context score calculated from exposure, sensitivity, environment, and asset type |
| Asset risk score | Finding pressure adjusted by asset context |
| Application risk score | Risk concentration across supporting assets |
| Business service risk score | Risk across applications and direct service assets |
| Business unit risk score | Portfolio average of business service risk |

The most important adoption output is the finding-level priority score because
it is the score that should drive remediation order.

## What Sponsors Should Evaluate

Sponsors should evaluate the data inputs as much as the equations. Most CRQ
scores are only as strong as the Brinqa data provided to the model.

Important review questions:

- Are vulnerability identifiers, CVSS, EPSS, and KEV joins complete enough?
- Are asset exposure fields accurate?
- Does the asset criticality aggregation reflect how sponsors think about risky
  asset context?
- Are PCI, PII, and other compliance fields populated consistently?
- Are environment and device type values normalized enough to score fairly?
- Are application, service, and business unit relationships complete?
- Are business criticality labels maintained by the right owners?
- Do the current weights match sponsor risk appetite?

If sponsors disagree with a formula, weight, component mapping, or input
mapping, those values should be treated as tunable model parameters. For
example, a sponsor may decide that the asset criticality formula should give
more weight to exposure, data sensitivity, production environment, or certain
asset types based on their risk appetite.

The aggregate score may not represent risk perfectly. It is best understood as
a structured signal that indicates which asset contexts are more likely to be
riskier when vulnerabilities are present.

## Current Documentation Gap

The main adoption-level gap is finalizing how sponsor-specific asset
criticality preferences, compliance metadata, and topology quality should
influence the finding-level priority score.

CRQ should keep the scoring model explainable, but sponsors should be able to
review and tune weights and mappings based on their data quality, industry
requirements, and risk appetite.
