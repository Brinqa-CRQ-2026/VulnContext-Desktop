# Master Scoring Overview

This document is the front door for the current Cyber Risk Quantification (CRQ) scoring model and the planned topology-based rollup model above it.

Audience:

- engineering
- product
- security operations
- leadership and sponsors

The goal is to explain three things clearly:

1. what scoring is implemented today
2. where scoring fields live in the database
3. how risk is intended to roll up from findings to business impact

Detailed implementation references remain in:

- [Backend Scoring Overview](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring/README.md)
- [CRQ Finding Scoring V4](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring/crq-finding-scoring-v4.md)
- [CRQ Asset Scoring V5](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring/crq-asset-scoring-v2.md)
- [CRQ Application Scoring V4](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring/crq-application-scoring-v1.md)
- [CRQ Business Service Scoring V4](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring/crq-business-service-scoring-v2.md)

## Executive Summary

The current scoring system persists CRQ scores at four layers:

- finding-level scoring in `public.findings`
- asset-level scoring in `public.assets`
- application-level scoring in `public.applications`
- business-service-level scoring in `public.business_services`

At the finding layer, CRQ v4 produces an app-owned score that keeps CVSS as the primary severity signal, then adjusts it with EPSS and KEV context. This gives the system a stable way to express how dangerous an individual vulnerability is before any environment context is added.

At the asset layer, the model adds technical context. It aggregates scored findings into an asset-level finding-risk signal, then separately calculates an asset context score based on exposure, data sensitivity, environment, and asset type. Together, those asset-level signals provide a better picture of which systems deserve attention first.

Above assets, the repo contains a topology structure for:

- company
- business unit
- business service
- application

Application and business-service risk now roll up persisted lower-layer scores. Company and business-unit scoring remain the longer-term direction for portfolio-level prioritization.

## Current Scoring Model Overview

The scoring model separates two concerns on purpose:

- finding risk: how dangerous a vulnerability is on its own
- asset context: how critical the affected system is in its environment

This keeps the model explainable. A vulnerability score should answer, "How bad is this issue?" An asset score should answer, "How much does the surrounding system context increase or decrease urgency?"

Status by layer:

| Layer | Status | Primary output |
| --- | --- | --- |
| Finding | Implemented now | `crq_finding_score`, `crq_finding_risk_band` |
| Asset | Implemented now | `crq_asset_aggregated_finding_risk`, `crq_asset_context_score`, `crq_asset_risk_score` |
| Application | Implemented now | `crq_application_aggregated_asset_risk`, `crq_application_risk_score` |
| Business Service | Implemented now | `crq_business_service_aggregated_application_risk`, `crq_business_service_risk_score` |
| Company | Planned / directional | aggregate organizational risk view |

## Finding Scoring

### Purpose

Finding scoring answers: how severe and exploitable is a specific vulnerability finding?

The current model is CRQ v4. It is a persisted scoring model for `public.findings` and is the system's primary app-owned vulnerability score when present.

### Core Logic

Formula:

`crq_finding_score = min(10, (cvss_score * 0.88) + epss_adjustment + kev_bonus)`

Why these fields matter:

- `CVSS` remains the main driver because it is the most broadly understood baseline severity measure.
- `EPSS` helps the model distinguish between vulnerabilities that are theoretically severe and vulnerabilities that are more likely to be exploited.
- `KEV` adds a strong signal for known exploited vulnerabilities already observed in the wild.
- `age` is persisted for context and reporting, but it is not currently part of the active score because the data quality for age handling is not yet trusted enough to defend as a scoring input.

### `public.findings` CRQ Fields

| Field | What it means | Why it exists |
| --- | --- | --- |
| `crq_finding_score` | Final CRQ finding score on a `0-10` scale | Gives the product a stable app-owned severity signal |
| `crq_finding_risk_band` | Band derived from the final score: `Critical`, `High`, `Medium`, `Low` | Makes scoring easier to scan in UI and reporting |
| `crq_finding_scored_at` | Timestamp of the most recent CRQ scoring run | Supports traceability and freshness checks |
| `crq_finding_score_version` | Version label for the scoring model | Allows model evolution without losing auditability |
| `crq_finding_cvss_score` | CVSS value used by the scorer | Preserves the exact severity input that drove the score |
| `crq_finding_epss_score` | EPSS probability value fetched for the CVE | Keeps the exploitability reference visible |
| `crq_finding_epss_percentile` | EPSS percentile used for banding logic | Explains why a positive or negative EPSS adjustment was applied |
| `crq_finding_epss_multiplier` | Effective EPSS adjustment added to the score | Makes the EPSS contribution explainable after scoring |
| `crq_finding_is_kev` | Boolean indicating whether the CVE is in KEV | Exposes the exploited-in-the-wild signal directly |
| `crq_finding_kev_bonus` | Numeric KEV bonus added to the score | Makes the KEV contribution auditable |
| `crq_finding_age_days` | Copied age reference value from the source finding | Preserves aging context for later reporting and future scoring use |
| `crq_finding_age_bonus` | Legacy age reference band, not used in final v4 score | Keeps historical compatibility without affecting active scoring |
| `crq_finding_notes` | Notes about missing inputs or fallback behavior | Explains how the scorer handled incomplete data |

### Logical Summary

Finding scoring makes sense because it keeps the first layer narrow and defensible. It does not try to capture business impact too early. It answers a smaller question well: how risky is this vulnerability as a finding, given severity and exploitability evidence?

## Asset Scoring

### Purpose

Asset scoring answers: how risky is the system context surrounding the findings, and how much does that context change prioritization?

The current asset model produces three outputs in `public.assets`:

- `crq_asset_aggregated_finding_risk`
- `crq_asset_context_score`
- `crq_asset_risk_score`

### Aggregated Finding Risk

This score summarizes the CRQ-scored findings on an asset without letting raw volume dominate.

Formula:

`crq_asset_aggregated_finding_risk = (0.25 * max_finding_score) + (0.50 * weighted_severity_average) + (0.25 * severity_burden_score)`

`weighted_severity_average = sum(finding_score * band_weight) / sum(band_weight)`

Severity weights are `4.0` for critical findings, `2.0` for high findings, `1.0` for medium findings, and `0.5` for low findings.

`severity_burden_score = log(1 + weighted_burden) / log(1 + scored_finding_count * 10) * 10`

This logic exists because naive aggregation fails:

- sum inflates noisy assets with many minor issues
- average hides serious outliers
- max-only ignores clusters of risky findings

The hybrid model works better:

- `max_score` captures worst-case risk
- `weighted_severity_average` captures the general risk level while emphasizing severe findings
- `severity_burden_score` captures severity-weighted finding burden without runaway inflation

### Asset Context Score

This score explains exposure-adjusted business and technical context. It is not pure criticality, and it does not create asset risk by itself.

Formula:

`crq_asset_context_score = 10 * ((0.35 * crq_asset_exposure_score) + (0.30 * crq_asset_data_sensitivity_score) + (0.20 * crq_asset_environment_score) + (0.15 * crq_asset_type_score))`

The component weights are intentional:

- exposure: `0.35`
- data sensitivity: `0.30`
- environment: `0.20`
- asset type: `0.15`

Why the model makes sense:

- exposure reflects how reachable the asset is
- data sensitivity reflects whether PCI or PII signals are present or unknown
- environment reflects operational importance
- asset type reflects role and likely blast radius

### Final Asset Risk Score

The final active asset risk score adjusts vulnerability pressure by context:

`crq_asset_risk_score = crq_asset_aggregated_finding_risk * (0.7 + (0.3 * crq_asset_context_score / 10))`

If an asset has no CRQ-scored findings, `crq_asset_risk_score = 0.0`. Context can reduce or preserve vulnerability pressure, but it does not create major risk without findings and the final score never exceeds aggregated finding risk.

### `public.assets` CRQ Fields

| Field | What it means | Why it exists |
| --- | --- | --- |
| `crq_asset_aggregated_finding_risk` | Aggregated CRQ risk of findings associated with the asset | Gives a stable finding-driven risk signal at the asset layer |
| `crq_asset_exposure_score` | Normalized exposure score | Explains how internet reachability and external posture affect criticality |
| `crq_asset_data_sensitivity_score` | Normalized sensitivity score | Shows how regulated or sensitive data raises urgency |
| `crq_asset_environment_score` | Normalized environment score | Captures the importance of production versus test or development |
| `crq_asset_type_score` | Normalized system-role score | Captures blast radius and infrastructure role |
| `crq_asset_context_score` | Weighted exposure-adjusted context score on a `0-10` scale | Gives the system an explainable context signal separate from raw finding severity |
| `crq_asset_risk_score` | Final active asset risk score | Adjusts vulnerability pressure by context without letting context create risk alone |
| `crq_asset_scored_at` | Timestamp of the most recent asset scoring run | Supports traceability and freshness checks |

### Asset Inputs That Drive Context

The context score depends on existing asset metadata fields in `public.assets`:

| Input field | How it is used | Logical reason |
| --- | --- | --- |
| `internal_or_external` | Drives exposure scoring | External systems are more reachable |
| `public_ip_addresses` | Drives exposure scoring | Public IPs indicate direct attack surface |
| `pci` | Drives sensitivity scoring | Payment data increases breach impact |
| `pii` | Drives sensitivity scoring | Personal data increases breach impact |
| `compliance_flags` | Stored context metadata | Retained for display and analysis, but not used by CRQ asset scoring v5 |
| `environment` | Drives environment scoring | Production systems usually have higher operational consequence |
| `device_type` | Drives asset-type scoring | Different system classes have different blast radius |
| `category` | Stored type metadata | Generic values such as `Host` do not raise CRQ asset type scoring in v5 |

### Logical Summary

Asset scoring makes sense because it introduces the context CVSS and exploitability alone cannot provide. It answers a different question than finding scoring: if this system is compromised, how much does the surrounding technical environment increase the urgency?

## Database Mapping

### `public.findings`

This table owns vulnerability-level scoring.

Raw source-oriented fields still matter:

- `brinqa_base_risk_score`
- `brinqa_risk_score`
- `cve_id`
- `age_in_days`

Derived CRQ fields live here because they describe the finding itself, not the asset:

- `crq_finding_score`
- `crq_finding_risk_band`
- `crq_finding_cvss_score`
- `crq_finding_epss_score`
- `crq_finding_epss_percentile`
- `crq_finding_epss_multiplier`
- `crq_finding_is_kev`
- `crq_finding_kev_bonus`
- `crq_finding_age_days`
- `crq_finding_age_bonus`
- `crq_finding_notes`

### `public.assets`

This table owns asset-level context and rollup-ready topology linkage.

Legacy and context fields still live here:

- `application`
- `business_service`
- `internal_or_external`
- `public_ip_addresses`
- `pci`
- `pii`
- `compliance_flags`
- `environment`
- `device_type`
- `category`

Derived CRQ asset fields also live here:

- `crq_asset_aggregated_finding_risk`
- `crq_asset_exposure_score`
- `crq_asset_data_sensitivity_score`
- `crq_asset_environment_score`
- `crq_asset_type_score`
- `crq_asset_context_score`
- `crq_asset_risk_score`
- `crq_asset_scored_at`

Topology transition fields live here as nullable foreign keys:

- `company_id`
- `business_unit_id`
- `business_service_id`
- `application_id`

This structure is logically useful because `assets` is the first layer where vulnerability data can be tied to system ownership, environment, service structure, and future business rollups.

## Topology Scoring Model

The intended topology scoring model builds risk progressively through the environment:

`Finding -> Asset -> Application -> Business Service -> Company`

What each layer adds:

- finding: technical severity and exploitability of a discrete issue
- asset: technical context of the affected system
- application: concentration of risk across supporting assets
- business service: operational importance and business consequence
- company: overall organizational risk posture

This model is important because organizations do not make risk decisions from isolated findings alone. They make them based on what those findings threaten in practice.

## Higher-Layer Scoring

### Current status

The repo contains topology entities, drill-down behavior, and persisted CRQ scoring for:

- companies
- business units
- business services
- applications

Application and business-service scoring are implemented. Company and business-unit scoring remain directional.

### Application scoring

Application scoring aggregates persisted `crq_asset_risk_score` values from supporting assets:

`crq_application_aggregated_asset_risk = (0.50 * weighted_asset_average) + (0.30 * max_asset_risk) + (0.20 * asset_burden_score)`

`asset_weight = log(1 + asset_finding_count)`

The final application risk adjusts that aggregate by PCI/PII compliance context:

`crq_application_risk_score = crq_application_aggregated_asset_risk * (0.7 + (0.3 * crq_application_compliance_score / 10))`

### Business-service scoring

Business-service scoring aggregates persisted application risk and direct asset risk with count-weighted averages:

`application_weight = log(1 + application_asset_count) + log(1 + application_finding_count)`

`direct_asset_weight = log(1 + direct_asset_finding_count)`

If both application and direct-asset risk exist:

`crq_business_service_risk_score = (0.80 * crq_business_service_aggregated_application_risk) + (0.20 * crq_business_service_aggregated_direct_asset_risk)`

If only one aggregate exists, the business-service risk score uses that aggregate directly.

### Intended direction

Business-unit scoring should aggregate business-service signals for operational portfolio views.

Company scoring should aggregate business service signals into a single organizational risk view suitable for portfolio tracking, executive reporting, and prioritization across the environment.

### Important constraint

Company and business-unit scoring ideas are planned and directional. They should not be presented as fully implemented formulas until the repo contains an authoritative scoring model for them.

## Design Principles

The scoring system is structured this way for five reasons:

- explainability: every major score can be decomposed into understandable inputs
- prioritization quality: context helps teams work the most important problems first
- reduced alert fatigue: the model avoids overreacting to raw volume alone
- layered decision-making: technical signals can roll up into operational and business decisions
- business alignment: the topology path makes it possible to connect vulnerabilities to services and eventually to company-level risk

This structure keeps the model practical for operators while making it legible to product and leadership stakeholders.

## References

- [Backend Scoring Overview](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring/README.md)
- [CRQ Finding Scoring V4](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring/crq-finding-scoring-v4.md)
- [CRQ Asset Scoring V5](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring/crq-asset-scoring-v2.md)
- [CRQ Application Scoring V4](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring/crq-application-scoring-v1.md)
- [CRQ Business Service Scoring V4](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring/crq-business-service-scoring-v2.md)
- [Backend Database Reference](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/architecture/database.md)
- [Business Services Feature Tracker](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/BUSINESS_SERVICES_FEATURE.md)
