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

- [scoring-model.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring-model.md)
- [crq-finding-scoring-v4.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/crq-finding-scoring-v4.md)
- [crq-asset-scoring-v1.md](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/crq-asset-scoring-v1.md)

## Executive Summary

The current scoring system is strongest at two layers:

- finding-level scoring in `public.findings`
- asset-level scoring in `public.assets`

At the finding layer, CRQ v4 produces an app-owned score that keeps CVSS as the primary severity signal, then adjusts it with EPSS and KEV context. This gives the system a stable way to express how dangerous an individual vulnerability is before any environment context is added.

At the asset layer, the model adds technical context. It aggregates scored findings into an asset-level finding-risk signal, then separately calculates an asset context score based on exposure, data sensitivity, environment, and asset type. Together, those asset-level signals provide a better picture of which systems deserve attention first.

Above assets, the repo already contains a topology structure for:

- company
- business unit
- business service
- application

Those higher layers currently exist primarily as navigation and relationship structure. The intended long-term direction is to use them for progressive risk rollups so prioritization can move from isolated vulnerabilities to operational and business impact.

## Current Scoring Model Overview

The scoring model separates two concerns on purpose:

- finding risk: how dangerous a vulnerability is on its own
- asset context: how critical the affected system is in its environment

This keeps the model explainable. A vulnerability score should answer, "How bad is this issue?" An asset score should answer, "How much does the surrounding system context increase or decrease urgency?"

Status by layer:

| Layer | Status | Primary output |
| --- | --- | --- |
| Finding | Implemented now | `crq_finding_score`, `crq_finding_risk_band` |
| Asset | Implemented now | `crq_asset_aggregated_finding_risk`, `crq_asset_context_score` |
| Application | Planned / directional | rollup of supporting asset risk |
| Business Service | Planned / directional | rollup of application risk plus business importance |
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

The current asset model produces two outputs in `public.assets`:

- `crq_asset_aggregated_finding_risk`
- `crq_asset_context_score`

It does not yet calculate or persist a final combined asset risk score.

### Aggregated Finding Risk

This score summarizes the CRQ-scored findings on an asset without letting raw volume dominate.

Formula:

`crq_asset_aggregated_finding_risk = 0.5 * max_score + 0.3 * top_k_avg + 0.2 * log_scaled_component`

This logic exists because naive aggregation fails:

- sum inflates noisy assets with many minor issues
- average hides serious outliers
- max-only ignores clusters of risky findings

The hybrid model works better:

- `max_score` captures worst-case risk
- `top_k_avg` captures concentration of serious issues
- `log_scaled_component` captures volume without runaway inflation

### Asset Context Score

This score explains how critical an asset is from a technical context perspective.

Formula:

`crq_asset_context_score = 10 * ((0.35 * crq_asset_exposure_score) + (0.30 * crq_asset_data_sensitivity_score) + (0.20 * crq_asset_environment_score) + (0.15 * crq_asset_type_score))`

The component weights are intentional:

- exposure: `0.35`
- data sensitivity: `0.30`
- environment: `0.20`
- asset type: `0.15`

Why the model makes sense:

- exposure reflects how reachable the asset is
- data sensitivity reflects the impact of compromise
- environment reflects operational importance
- asset type reflects role and likely blast radius

### `public.assets` CRQ Fields

| Field | What it means | Why it exists |
| --- | --- | --- |
| `crq_asset_aggregated_finding_risk` | Aggregated CRQ risk of findings associated with the asset | Gives a stable finding-driven risk signal at the asset layer |
| `crq_asset_exposure_score` | Normalized exposure score | Explains how internet reachability and external posture affect criticality |
| `crq_asset_data_sensitivity_score` | Normalized sensitivity score | Shows how regulated or sensitive data raises urgency |
| `crq_asset_environment_score` | Normalized environment score | Captures the importance of production versus test or development |
| `crq_asset_type_score` | Normalized system-role score | Captures blast radius and infrastructure role |
| `crq_asset_context_score` | Weighted technical criticality score on a `0-10` scale | Gives the system an explainable context signal separate from raw finding severity |
| `crq_asset_risk_score` | Reserved final combined asset risk field | Exists for later pipeline work, but is intentionally not populated yet |
| `crq_asset_scored_at` | Timestamp of the most recent asset scoring run | Supports traceability and freshness checks |

### Asset Inputs That Drive Context

The context score depends on existing asset metadata fields in `public.assets`:

| Input field | How it is used | Logical reason |
| --- | --- | --- |
| `internal_or_external` | Drives exposure scoring | External systems are more reachable |
| `public_ip_addresses` | Drives exposure scoring | Public IPs indicate direct attack surface |
| `pci` | Drives sensitivity scoring | Payment data increases breach impact |
| `pii` | Drives sensitivity scoring | Personal data increases breach impact |
| `compliance_flags` | Drives sensitivity scoring | Compliance markers are a useful sensitivity proxy |
| `environment` | Drives environment scoring | Production systems usually have higher operational consequence |
| `device_type` | Drives asset-type scoring | Different system classes have different blast radius |
| `category` | Supports asset-type interpretation | Helps express technical role more accurately |

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

## Planned Higher-Layer Scoring

### Current status

The repo already contains topology entities and drill-down behavior for:

- companies
- business units
- business services
- applications

Those layers are real in the data model and navigation flow, but the scoring formulas above assets are not yet finalized in repo truth.

### Intended direction

Application scoring should aggregate the risk of all supporting assets so teams can identify which applications inherit the greatest technical risk from their infrastructure.

Business service scoring should aggregate application risk and then introduce business importance. This is the layer where the model can move beyond technical urgency and start answering which operational capabilities matter most to the organization.

Company scoring should aggregate business service signals into a single organizational risk view suitable for portfolio tracking, executive reporting, and prioritization across the environment.

### Important constraint

These higher-layer scoring ideas are planned and directional. They should not be presented as fully implemented formulas until the repo contains an authoritative scoring model for them.

## Design Principles

The scoring system is structured this way for five reasons:

- explainability: every major score can be decomposed into understandable inputs
- prioritization quality: context helps teams work the most important problems first
- reduced alert fatigue: the model avoids overreacting to raw volume alone
- layered decision-making: technical signals can roll up into operational and business decisions
- business alignment: the topology path makes it possible to connect vulnerabilities to services and eventually to company-level risk

This structure keeps the model practical for operators while making it legible to product and leadership stakeholders.

## References

- [Scoring Model](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/scoring-model.md)
- [CRQ Finding Scoring V4](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/crq-finding-scoring-v4.md)
- [Asset Context Scoring V1](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/crq-asset-scoring-v1.md)
- [Supabase Database](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/docs/backend/current/supabase-database.md)
- [Business Services Feature Tracker](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/BUSINESS_SERVICES_FEATURE.md)
