# Technical Scoring Reference

This document is the canonical reference for Cyber Risk Quantification
(CRQ) scoring. It explains what is scored, how each score is calculated, where
scores are stored, how risk rolls up through the business topology, and how
finding-level priority ranks remediation work.

## 1. Overview

The CRQ scoring system exists to prioritize remediation by actual operating
risk, not by vulnerability severity alone. A high CVSS finding on an isolated
low-context system should not always outrank a slightly lower severity finding
on a public, production, sensitive-data asset that supports a critical business
service.

The model separates technical vulnerability pressure from environmental and
business context:

- finding risk answers: how severe and exploitable is this vulnerability?
- unified remediation priority answers: what should be fixed first when finding
  risk, asset context, and business criticality are considered together?
- asset context answers: how important and exposed is the affected system?
- asset risk answers: how much vulnerability pressure exists on the asset after
  context is applied?
- application risk answers: how concentrated is risk across the assets that
  support an application?
- business service risk answers: how much risk exists in applications and
  direct assets that support a service?
- business unit risk answers: what is the portfolio view across services in
  the unit?

Current topology:

```text
Company
  Business Unit
    Business Service
      Application
        Asset
          Finding
```

Current implementation status:

| Level | Status | Main persisted output |
| --- | --- | --- |
| Finding | Implemented | `crq_finding_score`, `crq_finding_risk_band` |
| Finding Priority | Defined at finding level | `crq_finding_priority_score` |
| Asset | Implemented | `crq_asset_aggregated_finding_risk`, `crq_asset_context_score`, `crq_asset_risk_score` |
| Application | Implemented | `crq_application_aggregated_asset_risk`, `crq_application_compliance_score`, `crq_application_risk_score` |
| Business Service | Implemented | `crq_business_service_risk_score` |
| Business Unit | Implemented as a rollup | `crq_business_unit_risk_score` |

## 2. Brinqa Data Assumptions

The current CRQ scoring model uses fields that are consistently present or
derivable from the current Brinqa data shape. These assumptions explain what
the model trusts today and where richer Brinqa metadata could improve future
versions.

### Vulnerability Data

The finding scorer trusts CVE identifiers enough to join findings to NVD, EPSS,
and KEV reference data. NVD CVSS is the primary severity input. EPSS percentile
and KEV membership are trusted as enrichment signals when available.

Finding age is retained for context, but it is not part of the active v4 finding
formula. Attack path data, active exploit telemetry, remediation complexity,
threat actor activity, and compensating controls are not currently represented
in the implemented finding score.

### Asset Metadata

Asset criticality scoring trusts Brinqa asset metadata for exposure,
environment, device type, and PCI/PII sensitivity. These values are normalized
into bounded component scores before they affect asset risk.

The current model assumes asset metadata is complete enough to classify public
reachability, internal/external placement, environment, and broad device role.
When values are missing or unknown, scoring uses conservative defaults rather
than treating unknown assets as fully safe.

The current product-facing asset criticality value is backed by
`crq_asset_context_score`. In API and UI surfaces, `asset_criticality` refers to
this scored asset context signal, not to a separate persisted database column.

### Compliance Fields

Current scoring uses PCI and PII because those fields are consistently
available in current Brinqa data. `compliance_flags` is retained as metadata but
ignored by active asset scoring v5.

Future versions may expand compliance weighting after additional compliance
metadata is available, validated, and consistently populated.

### Business Criticality Labels

Business service scoring assumes `criticality_label` is manually assigned,
maintained, and consistent across services. The scorer only parses labels that
begin with a number from `0` to `5` followed by `-` or `:`.

If a service has no parseable criticality label, CRQ should not invent business
criticality. Finding priority should use explicit missing-data behavior for
that case.

### Topology Relationships

Rollups assume Brinqa topology relationships are accurate enough to connect
findings to assets, assets to applications or business services, applications
to business services, and business services to business units.

Topology quality directly affects rollup quality. Missing or stale
relationships can understate risk concentration at the application, business
service, or business unit layer.

## 3. Data Mapping And Normalization

The active model maps Brinqa data into CRQ components before formulas are
applied. Some fields affect scoring directly, while others are retained as
metadata for future use.

| Brinqa Field | CRQ Component | Usage | Notes |
| --- | --- | --- | --- |
| `internal_or_external` | Asset exposure | Active scoring input | `External` maps to full exposure, `Internal` maps to partial exposure, missing values use a conservative default |
| `public_ip_addresses` | Asset exposure | Active scoring input | Presence of a public IP maps to full exposure |
| `pci` | Asset data sensitivity, application compliance | Active scoring input | Used with PII to raise sensitivity or compliance context |
| `pii` | Asset data sensitivity, application compliance | Active scoring input | Used with PCI to raise sensitivity or compliance context |
| `asset_criticality` | Asset criticality display concept | Backed by `crq_asset_context_score` in asset sorting and criticality distributions | Individual asset responses also expose `asset_context_score` directly |
| `compliance_flags` | Compliance metadata | Ignored by active asset scoring | Retained for future compliance expansion after field consistency is validated |
| `environment` | Asset environment | Active scoring input | Normalized into production, test/staging/QA, development, or unknown/default buckets |
| `device_type` | Asset type | Active scoring input | Normalized into broad infrastructure and endpoint categories |
| `category` | Asset metadata | Ignored by active asset type scoring | Retained as metadata but does not affect asset type scoring v5 |
| `criticality_label` | Business criticality | Active business-context input when parseable | Parsed only when the label begins with a `0-5` number followed by `-` or `:` |

## 4. Score Scales And Bands

Product-facing CRQ scores use a `0-10` scale:

- finding scores
- unified remediation priority scores
- aggregated finding risk
- asset context scores
- asset risk scores
- application rollup, compliance, and risk scores
- business service risk scores
- business unit risk scores

Normalized component inputs use a `0-1` scale:

- EPSS score and percentile
- asset exposure score
- asset criticality score, backed by `crq_asset_context_score`
- asset data sensitivity score
- asset environment score
- asset type score

Business service criticality uses a `0-5` scale after parsing the
`criticality_label`.

Risk bands use the same four threshold model wherever the API derives a display
band from a numeric score:

| Score range | Band |
| --- | --- |
| `>= 9.0` | Critical |
| `>= 7.0 and < 9.0` | High |
| `>= 4.0 and < 7.0` | Medium |
| `< 4.0` | Low |

Important storage detail: findings persist `crq_finding_risk_band`. Higher
layers generally persist numeric scores only; their display bands are derived
from the numeric score by API or UI helpers.

## 5. Unified Remediation Priority

Unified remediation priority is the finding-level score for ranking
remediation work across the CRQ hierarchy. It is separate from finding risk.

Risk answers:

```text
How dangerous is this vulnerability?
```

Priority answers:

```text
If only one thing can be fixed today, what should it be?
```

Implementation status: this section documents the approved finding-level
priority methodology and expected CRQ output field.

### Purpose

Finding risk deliberately excludes asset and business context. That keeps the
technical vulnerability score explainable, but it does not fully answer how to
rank all findings across the CRQ hierarchy.

Unified remediation priority combines:

- finding risk from CVSS, EPSS, and KEV
- asset context from exposure, asset criticality, data sensitivity,
  environment, and asset type
- business criticality from the business service supported by the asset

This creates one sorting score for remediation queues, top finding lists, asset
views, application views, service views, business unit views, and executive
views.

### Inputs

| Input | Scale | Source | Purpose |
| --- | --- | --- | --- |
| Finding risk | `0-10` | `crq_finding_score` | Technical severity and exploitation evidence |
| Asset context | `0-10` | `crq_asset_context_score` | Exposure, criticality, sensitivity, environment, and asset type |
| Business criticality | `0-5`, normalized to `0-10` | `business_criticality_score` | Business impact of the service the finding supports |

Business criticality must be normalized before use:

```text
normalized_business_criticality =
  (business_criticality_score / 5) * 10
```

### Formula

```text
unified_remediation_priority_score =
  (0.60 * crq_finding_score)
+ (0.20 * crq_asset_context_score)
+ (0.20 * normalized_business_criticality)
```

The `60/20/20` split keeps technical vulnerability risk as the primary driver
while allowing asset importance and business impact to change remediation order.

### Example

Inputs:

- finding risk: `9.0`
- asset context: `8.5`
- business criticality: `5 / 5`

Normalization:

```text
normalized_business_criticality = (5 / 5) * 10 = 10
```

Priority:

```text
unified_remediation_priority_score =
  (0.60 * 9.0)
+ (0.20 * 8.5)
+ (0.20 * 10)
= 9.1
```

### Current Limitations

Unified remediation priority depends on finding, asset, service, and topology
context being available in the scoring run. Current views may still display
finding risk, asset risk, application risk, service risk, or business unit risk
depending on the layer being shown.

The priority model also depends on reliable topology context. If a finding cannot
be connected to an asset, service, or parseable business criticality label, the
priority calculation needs explicit missing-data behavior during implementation.

### Future Improvements

Future scoring versions should keep unified finding priority as the common
remediation sorting signal across finding, asset, application, service,
business unit, and executive views.

The model may later incorporate richer inputs from the lower layers, including
asset criticality, expanded compliance metadata, weighted rollups, attack path
analysis, exploit telemetry, remediation effort, and compensating controls.

### Output Field

The finding-level priority output should use this field name:

| Field | Meaning |
| --- | --- |
| `crq_finding_priority_score` | Unified remediation priority score on a `0-10` scale |

Implementation details such as missing-data behavior, tie-breaking, API response
fields, and UI sorting should follow this methodology and remain explainable.

## 6. Finding Risk Score

Finding scoring is the first layer. It deliberately stays narrow: it scores the
vulnerability using severity and exploitation evidence before asset or business
context is added.

Implementation reference:
`backend/app/services/scoring/crq_finding.py`

Current version:
`v4`

### Inputs

| Input | Source | Purpose |
| --- | --- | --- |
| CVSS | `nvd.cvss_score` joined by `findings.cve_id` | Main severity signal |
| EPSS score | `epss_scores.epss` joined by CVE | Stored exploit probability reference |
| EPSS percentile | `epss_scores.percentile` joined by CVE | Drives score adjustment |
| KEV membership | `kev.cve` joined by CVE | Adds known exploited signal |
| Age | `findings.age_in_days` | Stored for context, not included in active v4 formula |

### Formula

```text
crq_finding_score =
  min(10.0, (cvss_score * 0.88) + epss_adjustment + kev_bonus)
```

If NVD CVSS is missing, the scorer uses `0.0` as the CVSS input and writes a
note to `crq_finding_notes`.

### EPSS Adjustment

EPSS is an additive point adjustment into the `0-10` finding score. It is not a
standalone risk score.

| Condition | EPSS adjustment |
| --- | --- |
| EPSS percentile is missing | `0.0` |
| CVSS is `<= 0.0` | `0.0` |
| CVSS `< 4.0` and percentile `< 0.20` | `-0.20` |
| CVSS `< 4.0` and percentile `< 0.50` | `-0.05` |
| percentile `< 0.20` | `-0.40` |
| percentile `< 0.50` | `-0.15` |
| percentile `< 0.80` | `0.0` |
| percentile `< 0.95` | `0.35` |
| percentile `>= 0.95` | `0.75` |

Low CVSS findings receive softened negative EPSS adjustments so that a low
severity vulnerability is not over-penalized by low exploitability.

### KEV Bonus

| Condition | KEV bonus |
| --- | --- |
| CVE exists in `kev` | `0.9` |
| CVE does not exist in `kev` | `0.0` |

KEV represents observed exploitation in the wild, so it is a strong positive
signal in the finding score.

### Age Reference

Age is persisted but excluded from the active v4 formula.

| Age condition | Persisted age bonus |
| --- | --- |
| missing age | `0.0` |
| `<= 30` days | `0.0` |
| `<= 90` days | `0.25` |
| `<= 180` days | `0.5` |
| `> 180` days | `1.0` |

This exists for reporting and future model work. It should not be described as
part of the current final finding score.

### Finding Risk Band

The scorer persists `crq_finding_risk_band` from the final score:

| Finding score | Persisted band |
| --- | --- |
| `>= 9.0` | Critical |
| `>= 7.0 and < 9.0` | High |
| `>= 4.0 and < 7.0` | Medium |
| `< 4.0` | Low |

### Current Limitations

Finding scoring currently uses CVSS, EPSS, and KEV. It does not include attack
path awareness, active exploit telemetry, threat actor targeting, remediation
complexity, or compensating controls.

Finding age is stored for context and retained as a reference field, but age is
not included in the active v4 final finding score.

### Future Improvements

Future finding scoring may incorporate additional intelligence beyond CVSS,
EPSS, and KEV, such as attack path analysis, exploit telemetry, threat
intelligence, exploit maturity, threat actor activity, remediation effort, and
compensating controls.

These signals should be added only after their source quality and scoring impact
can be validated.

### Finding Fields

| Field | Meaning |
| --- | --- |
| `crq_finding_score` | Final CRQ finding score on a `0-10` scale |
| `crq_finding_risk_band` | Persisted band derived from the final score |
| `crq_finding_scored_at` | Timestamp for the last finding scoring run |
| `crq_finding_score_version` | Current model version, currently `v4` |
| `crq_finding_cvss_score` | CVSS value used by the scorer |
| `crq_finding_epss_score` | EPSS probability value |
| `crq_finding_epss_percentile` | EPSS percentile used for adjustment logic |
| `crq_finding_epss_multiplier` | Additive EPSS adjustment written for explainability |
| `crq_finding_is_kev` | Whether the CVE exists in KEV |
| `crq_finding_kev_bonus` | Additive KEV bonus |
| `crq_finding_age_days` | Source age copied from `findings.age_in_days` |
| `crq_finding_age_bonus` | Reference age bonus, excluded from v4 final scoring |
| `crq_finding_notes` | Missing-input and fallback notes |

## 7. Asset Context And Asset Risk

Asset scoring adds system context to the vulnerability pressure from findings.
It produces three important outputs:

- `crq_asset_aggregated_finding_risk`
- `crq_asset_context_score`
- `crq_asset_risk_score`

Implementation reference:
`backend/app/services/scoring/crq_asset.py`

Current version:
`v5`

### Aggregated Finding Risk

An asset can have many findings. The scorer avoids three naive approaches:

- raw sum, which lets volume inflate noisy assets
- simple average, which can hide a severe outlier
- max-only, which ignores clusters of serious findings

Instead, the scorer combines worst-case risk, severity-weighted average risk,
and bounded severity burden.

```text
crq_asset_aggregated_finding_risk =
  (0.25 * max_finding_score)
+ (0.50 * weighted_severity_average)
+ (0.25 * severity_burden_score)
```

What each part represents:

| Part | What it represents | Why it is included |
| --- | --- | --- |
| `max_finding_score` | The single worst CRQ finding on the asset | Preserves urgent outliers so one severe finding cannot be hidden by many lower findings |
| `weighted_severity_average` | The typical finding risk level, with more severe findings carrying more weight | Represents the general quality of the finding set without treating every finding equally |
| `severity_burden_score` | A bounded measure of how much severity-weighted finding volume exists | Captures clusters of risky findings without letting raw finding count dominate the asset score |

The weights intentionally make the average risk signal the center of the model.
The max score and burden score each contribute less, because they are supporting
signals: one protects against hidden outliers, and the other protects against
ignoring repeated high-risk findings.

Weighted severity average:

```text
weighted_severity_average =
  sum(finding_score * severity_average_weight)
  / sum(severity_average_weight)
```

The weighted severity average answers: "Across the scored findings on this
asset, how risky is the typical finding after emphasizing more severe findings?"
It is not a plain average. Plain averages can make a critical-heavy asset look
too similar to an asset with mostly low and medium findings. The severity weight
pulls the average toward the findings that matter most operationally.

Severity average weights:

| Finding score | Weight |
| --- | --- |
| `>= 9.0` | `4.0` |
| `>= 6.0 and < 9.0` | `2.0` |
| `>= 3.0 and < 6.0` | `1.0` |
| `< 3.0` | `0.5` |

These weights are stronger for critical and high findings because remediation
priority should react more to severe vulnerabilities than to low-risk cleanup
items. Low findings still contribute, but they are deliberately muted.

Severity burden:

```text
severity_burden_score =
  log(1 + weighted_burden)
  / log(1 + scored_finding_count * 10)
  * 10
```

Severity burden answers: "Is this asset carrying a concentration of risky
findings?" It is different from the weighted average. The average describes the
typical risk level; burden describes how much severity-weighted risk is stacked
on the same asset.

The logarithm is there to prevent runaway inflation. Without log scaling, an
asset with a large number of low or medium findings could overwhelm a smaller
asset with fewer but more serious findings. Log scaling lets volume matter, but
with diminishing returns as the count grows.

The denominator normalizes the burden against the number of scored findings, so
the result stays on the same `0-10` scale as the other CRQ scores.

Burden weights:

| Finding score | Burden weight |
| --- | --- |
| `>= 9.0` | `10.0` |
| `>= 6.0 and < 9.0` | `5.0` |
| `>= 3.0 and < 6.0` | `2.0` |
| `< 3.0` | `0.5` |

Burden weights are more aggressive than average weights because this part of
the formula is specifically looking for accumulation. A critical finding adds
more burden than a high finding, and a high finding adds more burden than a
medium finding, so a cluster of serious findings visibly raises the asset's
aggregate finding risk.

If there are no CRQ-scored findings, aggregated finding risk is `0.0`.

### Asset Criticality Score

Asset criticality is the product-facing name for the current asset context
score. In code, this is stored as `crq_asset_context_score`. Asset sorting and
criticality distributions use this score; individual asset responses also expose
it directly as `asset_context_score`.

The score uses normalized `0-1` component scores and converts them to a `0-10`
asset criticality/context score.

```text
asset criticality score / crq_asset_context_score =
  10 * (
    0.35 * crq_asset_exposure_score
  + 0.30 * crq_asset_data_sensitivity_score
  + 0.20 * crq_asset_environment_score
  + 0.15 * crq_asset_type_score
  )
```

Component weights:

| Component | Weight |
| --- | --- |
| Exposure | `0.35` |
| Data sensitivity | `0.30` |
| Environment | `0.20` |
| Asset type | `0.15` |

What each component represents:

| Component | What it represents | Why it is weighted this way |
| --- | --- | --- |
| Exposure | How reachable the asset is from an attacker perspective | Highest weight because externally reachable or publicly addressed systems generally have less protection from network position |
| Data sensitivity | Whether the asset is associated with PCI or PII | High weight because compromise impact is larger when sensitive or regulated data may be involved |
| Environment | Whether the asset supports production, test, staging, or development work | Medium weight because production systems usually carry higher operational consequence |
| Asset type | The role of the system, such as firewall, router, server, workstation, or printer | Lower but meaningful weight because infrastructure role affects blast radius, but should not overpower exposure and data sensitivity |

These are criticality/context factors, not vulnerability factors. They explain
how much the surrounding asset context should preserve or reduce urgency after
finding risk has already been calculated.

Exposure score:

| Inputs | Score |
| --- | --- |
| `public_ip_addresses` present | `1.0` |
| `internal_or_external = External` | `1.0` |
| `internal_or_external = Internal` | `0.5` |
| unknown | `0.4` |

Data sensitivity score:

| Inputs | Score |
| --- | --- |
| PCI and PII true | `1.0` |
| PCI or PII true | `0.8` |
| PCI and PII both missing | `0.4` |
| PCI and PII false | `0.2` |

`compliance_flags` is retained as metadata but ignored by asset scoring v5.

Environment score:

| `environment` value | Score |
| --- | --- |
| `production`, `prod` | `1.0` |
| `test`, `staging`, `qa` | `0.6` |
| `development`, `dev` | `0.3` |
| anything else or missing | `0.5` |

Asset type score:

| `device_type` value | Score |
| --- | --- |
| `Firewall` | `1.0` |
| `Router` | `0.95` |
| `Network` | `0.95` |
| `Hypervisor` | `0.9` |
| `Server` | `0.8` |
| `Cloud server` | `0.8` |
| `Workstation` | `0.4` |
| `Printer` | `0.3` |
| `Unknown` | `0.5` |
| anything else or missing | `0.5` |

`category` is retained as metadata but does not affect asset type scoring v5.

The current implementation does not require a separate `asset_criticality`
source column. It computes asset criticality from the fields that are currently
available and consistently populated in Brinqa data.

Future versions may add a direct business-owner-assigned criticality input. If
that is added, it should be normalized to the same `0-1` component scale before
it changes the formula.

Example static mapping:

| Asset or system type | Example criticality |
| --- | --- |
| Domain controller | High |
| Revenue application database | High |
| Customer portal server | High |
| Payroll system | High |
| Internal wiki | Medium |
| Developer sandbox | Low |
| Test lab machine | Low |

Example normalized score:

| Criticality | Score |
| --- | --- |
| High | `1.0` |
| Medium | `0.6` |
| Low | `0.3` |
| Unknown or missing | `0.5` |

These values are examples for sponsor review of a possible future owner-assigned
component. A sponsor may choose different component mappings based on industry
requirements, operating model, asset ownership, revenue impact, customer impact,
or internal risk appetite.

Important modeling note: asset criticality may not represent risk entirely by
itself. It represents a signal that the asset may become riskier when
vulnerabilities are present because the asset is more exposed, sensitive,
production-relevant, infrastructure-relevant, or important to operations,
customers, revenue, identity, or service dependencies.

### Final Asset Risk

The final asset score applies context as a bounded multiplier to vulnerability
pressure:

```text
crq_asset_risk_score =
  crq_asset_aggregated_finding_risk
  * (0.7 + (0.3 * crq_asset_context_score / 10))
```

The multiplier ranges from `0.7` to `1.0`. A low-context asset can reduce the
finding-driven risk by up to 30 percent, while a high-context asset preserves
the full aggregated finding risk.

This design is intentional: asset context should influence priority, but it
should not manufacture risk when no vulnerabilities are present. It also should
not make the final asset score higher than the vulnerability pressure already
observed on that asset.

Important behavior:

- if aggregated finding risk is `0.0`, final asset risk is `0.0`
- context does not create risk without findings
- context can reduce or preserve finding pressure
- final asset risk never exceeds aggregated finding risk

### Current Limitations

The active asset criticality formula is based on exposure, PCI/PII sensitivity,
environment, and asset type. It does not yet include a separate
business-owner-assigned criticality field, so a production server and a
production server supporting a revenue-generating application can receive
similar asset criticality scores if they share similar component values.

Additional business importance is represented through business service
criticality, application rollups, and topology relationships.

The exposure model is intentionally simplified. PCI and PII are the only active
data sensitivity inputs, and `compliance_flags` is currently ignored by asset
scoring v5.

### Future Improvements

Future versions may add a direct business-owner criticality component to extend
the existing asset criticality score. Possible future inputs include
business-owner assigned importance, operational impact, customer impact,
revenue impact, and dependency importance.

One possible future direction is to rebalance the implemented asset criticality
formula from the current model:

```text
Asset Context
35% Exposure
30% Data Sensitivity
20% Environment
15% Asset Type
```

to an expanded model that includes a separate owner-assigned business
criticality component:

```text
Asset Context
30% Exposure
25% Data Sensitivity
15% Environment
10% Asset Type
20% Owner-Assigned Business Criticality
```

This future weighting is illustrative only. It must not be treated as current
methodology until implemented, tested, and reflected in the scoring services.

Future versions may also expand compliance weighting after additional
compliance metadata is available and validated. Potential future signals include
HIPAA, PHI, SOX, FedRAMP, CJIS, FERPA, GDPR, CCPA, Financial Data, Trade
Secrets, and Intellectual Property.

### Asset Fields

| Field | Meaning |
| --- | --- |
| `crq_asset_aggregated_finding_risk` | Aggregated risk of CRQ-scored findings on the asset |
| `crq_asset_exposure_score` | Normalized exposure component |
| `crq_asset_data_sensitivity_score` | Normalized sensitivity component |
| `crq_asset_environment_score` | Normalized environment component |
| `crq_asset_type_score` | Normalized asset type component |
| `crq_asset_context_score` | Weighted asset criticality/context score on a `0-10` scale |
| `crq_asset_risk_score` | Final asset risk score |
| `crq_asset_finding_count` | Count of CRQ-scored findings considered by asset scoring |
| `crq_asset_scored_at` | Timestamp for the last asset scoring run |

Context source fields:

- `internal_or_external`
- `public_ip_addresses`
- `pci`
- `pii`
- `compliance_flags`
- `environment`
- `device_type`
- `category`

Topology linkage fields:

- `company_id`
- `business_unit_id`
- `business_service_id`
- `application_id`

## 8. Application Scoring

Application scoring rolls up persisted asset risk scores. It does not recompute
finding or asset scoring.

Implementation reference:
`backend/app/services/scoring/crq_application.py`

Current version:
`v4`

### Aggregated Asset Risk

Each asset score is weighted by the number of findings associated with that
asset. The weighting uses a log transform so assets with more findings matter
more, but volume does not grow without bound.

```text
asset_weight =
  log(1 + asset_finding_count)
```

`asset_weight` represents how much supporting evidence exists behind an asset's
risk score. An asset with more findings carries more evidence of vulnerability
pressure, so it gets more influence in the application rollup. The log transform
keeps that influence from scaling linearly forever.

```text
weighted_asset_average =
  sum(asset_risk_score * asset_weight)
  / sum(asset_weight)
```

The weighted asset average answers: "Across the application's assets, what is
the typical asset risk after giving more influence to assets with more finding
evidence?" This avoids treating a lightly observed asset the same as an asset
with a larger set of confirmed findings.

```text
asset_burden_score =
  log(1 + total_asset_risk)
  / log(1 + asset_count * 10)
  * 10
```

`asset_burden_score` represents concentration of asset risk across the
application. It increases when many assets carry meaningful risk, but it uses
log scaling so an application with a long list of small risks does not
automatically outrank an application with fewer but more severe asset risks.

```text
crq_application_aggregated_asset_risk =
  (0.50 * weighted_asset_average)
+ (0.30 * max_asset_risk)
+ (0.20 * asset_burden_score)
```

What each part represents:

| Part | What it represents | Why it is included |
| --- | --- | --- |
| `weighted_asset_average` | The application's normal asset risk level, weighted by finding evidence | Main signal because application risk should mostly reflect the risk profile of its supporting assets |
| `max_asset_risk` | The riskiest single asset supporting the application | Keeps one dangerous asset from being hidden by safer assets |
| `asset_burden_score` | How much asset risk is distributed across the application | Captures broad exposure without letting asset count dominate |

Important behavior:

- null asset risk scores are ignored
- if all asset weights are `0.0`, aggregated asset risk is `0.0`
- final output is clamped to `0-10` and rounded to two decimals

### Application Compliance Score

The application compliance score is derived from `applications.tags` using PCI
and PII tags only.

| Tags | `crq_application_compliance_score` |
| --- | --- |
| both PCI and PII | `10.0` |
| PCI or PII | `8.0` |
| missing tags | `4.0` |
| tags present but neither PCI nor PII | `2.0` |

This score represents business and regulatory impact context at the application
level. PCI and PII tags raise the score because compromise of applications that
handle payment or personal data usually carries higher legal, operational, and
customer impact. Missing tags use a middle-low default of `4.0` so unknown data
classification is not treated as fully safe, but it also does not receive the
same weight as confirmed PCI or PII.

### Final Application Risk

```text
crq_application_risk_score =
  crq_application_aggregated_asset_risk
  * (0.7 + (0.3 * crq_application_compliance_score / 10))
```

The compliance multiplier follows the same pattern as asset context: it ranges
from `0.7` to `1.0`. Compliance context can preserve more of the asset-derived
risk for sensitive applications, but it cannot create risk without risky assets
and cannot raise final application risk above the aggregated asset risk.

Important behavior:

- if aggregated asset risk is `0.0`, final application risk is `0.0`
- compliance does not create risk without asset risk
- final application risk does not exceed aggregated asset risk

### Current Limitations

Application scoring uses PCI and PII tags only for compliance context. It does
not currently use broader compliance or business impact metadata.

Application risk quality depends on linkage quality between applications and
supporting assets. Missing or stale relationships can understate application
risk.

### Future Improvements

Future application scoring may expand compliance context beyond PCI and PII once
additional Brinqa metadata is available and validated.

Future versions may also incorporate richer application business context, such
as application owner, operational impact, customer impact, revenue impact, or
service dependency importance.

### Application Fields

| Field | Meaning |
| --- | --- |
| `crq_application_aggregated_asset_risk` | Rollup of child asset risk scores |
| `crq_application_compliance_score` | PCI/PII compliance context score |
| `crq_application_risk_score` | Final application risk score |
| `crq_application_asset_count` | Count of assets linked to the application |
| `crq_application_finding_count` | Count of findings across linked assets |
| `crq_application_scored_at` | Timestamp for the last application scoring run |

## 9. Business Service Scoring

Business service scoring rolls up two lower-level paths:

- application risk from child applications
- direct asset risk from assets linked directly to the business service with no
  application

Business criticality remains important context for remediation decisions, but
the primary priority model in this reference is the finding-level unified
remediation priority documented in section 5.

Implementation reference:
`backend/app/services/scoring/crq_business_service.py`

Current version:
`v4`

### Business Criticality

The scorer parses `criticality_label` into `business_criticality_score`.

Supported labels start with a number from `0` to `5` followed by `-` or `:`.

Examples:

| `criticality_label` | Parsed score |
| --- | --- |
| `5-critical` | `5` |
| `4: high` | `4` |
| `2-low` | `2` |
| `0 - none` | `0` |
| `critical` | `null` |
| `6-critical` | `null` |

The database constraint allows `business_criticality_score` to be null or
between `0` and `5`.

Business criticality represents how important the service is to the business,
separate from the technical risk currently observed. It is intentionally not
mixed directly into `crq_business_service_risk_score` so the system can explain
the difference between "how risky is this service?" and "how important is the
service that risk affects?"

### Aggregated Application Risk

Application risk scores are weighted by application asset count and finding
count.

```text
application_weight =
  log(1 + application_asset_count)
  + log(1 + application_finding_count)
```

`application_weight` represents how much footprint and vulnerability evidence
the application contributes to the service. Asset count approximates service
footprint; finding count approximates vulnerability pressure. Both use log
scaling so one very large application does not completely dominate the service
rollup.

```text
crq_business_service_aggregated_application_risk =
  sum(application_risk_score * application_weight)
  / sum(application_weight)
```

This weighted average answers: "Across the applications that support this
service, what is the service's application-driven risk?" It gives more influence
to applications with larger footprints and more findings, but it still remains a
bounded `0-10` average.

Important behavior:

- null application risk scores are ignored
- if total application weight is `0.0`, the aggregate is `0.0`
- application count still includes applications with null risk

### Aggregated Direct Asset Risk

Direct assets are assets linked to the business service where `application_id`
is null.

```text
direct_asset_weight =
  log(1 + direct_asset_finding_count)
```

`direct_asset_weight` represents finding evidence for assets attached directly
to the business service without an application. These assets still matter to
service risk, but their only available weighting signal is finding count.

```text
crq_business_service_aggregated_direct_asset_risk =
  sum(direct_asset_risk_score * direct_asset_weight)
  / sum(direct_asset_weight)
```

This weighted average answers: "How much risk exists in service-owned assets
that are not already represented through an application?" Keeping direct assets
separate prevents them from being ignored while avoiding double counting assets
that already roll up through applications.

Important behavior:

- null direct asset risk scores are ignored
- if total direct asset weight is `0.0`, the aggregate is `0.0`
- direct assets with null risk still count in asset counts

### Final Business Service Risk

The service risk combines application and direct asset risk only when both
scored paths exist.

```text
if no scored applications and no scored direct assets:
  crq_business_service_risk_score = 0.0

if scored applications exist and no scored direct assets exist:
  crq_business_service_risk_score =
    crq_business_service_aggregated_application_risk

if scored direct assets exist and no scored applications exist:
  crq_business_service_risk_score =
    crq_business_service_aggregated_direct_asset_risk

if both scored applications and scored direct assets exist:
  crq_business_service_risk_score =
    (0.80 * crq_business_service_aggregated_application_risk)
  + (0.20 * crq_business_service_aggregated_direct_asset_risk)
```

A zero risk score still counts as scored if the lower-level score is present.
This matters when one side has an explicit `0.0` and the other side has
positive risk.

The `80/20` split is used only when both paths exist because application risk is
the primary service-level signal. Applications represent organized business
functionality and already contain asset rollups. Direct assets are still
included because some service-supporting systems may not be assigned to an
application, but they receive less weight to avoid overpowering the application
view.

### Business Service Counts

The scorer persists counts that support rollups and UI summaries:

- `crq_business_service_application_count`
- `crq_business_service_asset_count`
- `crq_business_service_finding_count`

Asset counting deduplicates assets that are reachable both through a direct
business-service relationship and through an application relationship.

Finding count is based on unique service assets so findings are not double
counted through multiple paths.

### Current Limitations

Business service criticality assumes labels are manually assigned, maintained,
and consistent. The current model does not calibrate labels against actual
revenue impact, customer impact, operational dependency, or service ownership.

The scorer does not infer missing criticality. If `criticality_label` is absent
or not parseable, the service still receives a risk score, but it does not
receive additional business-importance context from that label.

### Future Improvements

Future business service scoring may add criticality calibration, criticality
validation, criticality inheritance from linked applications or assets, and
automated criticality suggestions.

Future backend work should align service, business unit, and executive views
around unified finding priority so all remediation views answer the same
question: what should be fixed first?

### Business Service Fields

| Field | Meaning |
| --- | --- |
| `business_criticality_score` | Parsed `0-5` score from `criticality_label` |
| `crq_business_service_aggregated_application_risk` | Weighted rollup of child application risk |
| `crq_business_service_aggregated_direct_asset_risk` | Weighted rollup of direct asset risk |
| `crq_business_service_risk_score` | Final business service risk score |
| `crq_business_service_application_count` | Count of child applications |
| `crq_business_service_asset_count` | Deduplicated count of service assets |
| `crq_business_service_finding_count` | Count of findings across unique service assets |
| `crq_business_service_scored_at` | Timestamp for the last service scoring run |

## 10. Business Unit Rollup

Business unit scoring is implemented as a rollup inside the business-service
scoring module. The entrypoint scores business services first, then updates
affected business units.

Implementation reference:
`backend/app/services/scoring/crq_business_service.py`

### Formula

```text
crq_business_unit_risk_score =
  average(crq_business_service_risk_score)
```

Business unit rollups represent a portfolio view across services. The current
implementation uses a simple average because business services are already the
business-facing units of risk. This keeps the business unit score
easy to explain: it is the average condition of scored services in that unit,
not a separate model with hidden weighting.

The database aggregate uses SQL `AVG`, so null business service scores are
ignored. If a business unit has no scored services, the persisted rollup uses
`0.0`.

### Current Limitations

Business unit risk uses a simple average of child business service risk scores.
This is intentionally simple for explainability, but it does not currently
weight services by size, criticality, asset count, finding count, application
count, or revenue contribution.

### Future Improvements

Future rollups may consider weighting by service criticality, finding count,
asset count, application count, or revenue contribution.

Any weighted rollup should preserve the ability to explain why one portfolio
outranks another.

### Counts

Business unit counts are summed from business service count fields:

```text
crq_business_unit_business_service_count =
  count(child business services)

crq_business_unit_application_count =
  sum(crq_business_service_application_count)

crq_business_unit_asset_count =
  sum(crq_business_service_asset_count)

crq_business_unit_finding_count =
  sum(crq_business_service_finding_count)
```

### Business Unit Fields

| Field | Meaning |
| --- | --- |
| `crq_business_unit_risk_score` | Average business service risk |
| `crq_business_unit_business_service_count` | Number of services in the unit |
| `crq_business_unit_application_count` | Sum of application counts from services |
| `crq_business_unit_asset_count` | Sum of asset counts from services |
| `crq_business_unit_finding_count` | Sum of finding counts from services |

## 11. Propagation Model

Risk scoring propagates upward by using already-persisted lower-layer scores:

```text
Finding risk score
  -> Asset aggregated finding risk
  -> Asset context score
  -> Asset risk score
  -> Application aggregated asset risk
  -> Application compliance score
  -> Application risk score
  -> Business service application/direct asset rollups
  -> Business service risk score
  -> Business unit risk rollup
```

Unified priority is the remediation-ranking signal:

```text
Finding priority
  -> Remediation queues
  -> Asset, application, service, business unit, and executive views
```

Higher-level views should use finding priority for remediation ranking and risk
scores for portfolio risk summaries unless a later scoring version explicitly
documents a different method.

Each layer intentionally adds only the context it owns:

| Layer | Adds |
| --- | --- |
| Finding | CVSS, EPSS, KEV, age reference |
| Asset | Exposure, asset criticality, sensitivity, environment, asset type |
| Application | Asset concentration and PCI/PII tag context |
| Business Service | Application/direct-asset topology and criticality |
| Business Unit | Portfolio average across services |
| Company View | Cross-portfolio reporting context |

This keeps the model explainable. A business service score can be decomposed
back into applications, assets, and findings instead of becoming an opaque
number.

## 12. Recalculation And Operations

The API surfaces persisted scores. It does not recalculate CRQ scores during
request handling.

Manual scoring order:

```bash
make score-crq-findings
make score-crq-assets
make score-crq-applications
make score-crq-business-services
```

Equivalent scripts:

```bash
cd backend
python3 scripts/manual/score_crq_findings_v1.py
python3 scripts/manual/score_crq_assets_v2.py
python3 scripts/manual/score_crq_applications_v2.py
python3 scripts/manual/score_crq_business_services_v1.py
```

Targeting support:

- finding scoring accepts specific finding IDs in the service layer
- asset scoring accepts specific asset IDs in the service layer
- application scoring accepts specific application IDs in the service layer
- business-service scoring accepts `--business-service-id`
- business-service scoring also updates affected business unit rollups

Daily enrichment automation:

- `backend/scripts/automation/sync_epss.py` refreshes EPSS data
- `backend/scripts/automation/sync_kev.py` refreshes KEV data
- `backend/scripts/automation/sync_daily.py` runs EPSS sync, KEV sync, and KEV
  flag updates

Important operational rule: after EPSS, KEV, NVD, findings, assets, or topology
data changes, scoring must be rerun in dependency order for upper layers to
reflect the new inputs.

## 13. Worked Example

This example uses rounded values to show propagation. It follows implemented
risk formulas and includes the unified remediation priority formula.

### Finding

Input:

- CVSS: `8.0`
- EPSS percentile: `0.97`
- KEV: yes

Calculation:

```text
base = 8.0 * 0.88 = 7.04
epss_adjustment = 0.75
kev_bonus = 0.90

crq_finding_score = min(10, 7.04 + 0.75 + 0.90)
                  = 8.69
```

Band:

```text
8.69 -> High
```

### Asset

Assume one asset has three scored findings:

```text
[8.69, 7.20, 2.50]
```

Finding rollup components:

```text
max_finding_score = 8.69

weighted_severity_average =
  ((8.69 * 2.0) + (7.20 * 2.0) + (2.50 * 0.5))
  / (2.0 + 2.0 + 0.5)
  = 7.34

weighted_burden = 5.0 + 5.0 + 0.5 = 10.5

severity_burden_score =
  log(1 + 10.5) / log(1 + 3 * 10) * 10
  = 7.10

crq_asset_aggregated_finding_risk =
  (0.25 * 8.69) + (0.50 * 7.34) + (0.25 * 7.10)
  = 7.62
```

Assume asset context:

- external: exposure `1.0`
- PCI true and PII false: sensitivity `0.8`
- production: environment `1.0`
- server: asset type `0.8`

```text
crq_asset_context_score =
  10 * ((0.35 * 1.0) + (0.30 * 0.8) + (0.20 * 1.0) + (0.15 * 0.8))
  = 9.10
```

The calculated `crq_asset_context_score` is the active asset criticality score
used by asset sorting and criticality distributions.

Final asset risk:

```text
crq_asset_risk_score =
  7.62 * (0.7 + (0.3 * 9.10 / 10))
  = 7.41
```

### Application

Assume an application has three asset risk scores and finding counts:

| Asset | Risk score | Finding count |
| --- | ---: | ---: |
| Asset A | `7.41` | `3` |
| Asset B | `6.20` | `2` |
| Asset C | `0.00` | `0` |

The weighted asset average uses `log(1 + finding_count)`. Asset C contributes no
weight because its finding count is `0`.

Assume the resulting application aggregate is:

```text
crq_application_aggregated_asset_risk = 6.85
```

If the application has PCI and PII tags:

```text
crq_application_compliance_score = 10.0
```

Final application risk:

```text
crq_application_risk_score =
  6.85 * (0.7 + (0.3 * 10 / 10))
  = 6.85
```

### Business Service

Assume a business service has:

- aggregated application risk: `6.85`
- aggregated direct asset risk: `5.50`
- at least one scored application
- at least one scored direct asset
- `criticality_label = 5-critical`

Final service risk:

```text
crq_business_service_risk_score =
  (0.80 * 6.85) + (0.20 * 5.50)
  = 6.58
```

Business criticality:

```text
business_criticality_score = 5
normalized_business_criticality = (5 / 5) * 10 = 10
```

Unified remediation priority for Asset A's finding:

```text
crq_finding_priority_score =
  (0.60 * 8.69)
+ (0.20 * 9.10)
+ (0.20 * 10)
= 9.03
```

### Business Unit

Assume the business unit has two scored services:

| Service | Risk |
| --- | ---: |
| Service A | `6.58` |
| Service B | `4.20` |

Rollup:

```text
crq_business_unit_risk_score =
  (6.58 + 4.20) / 2
  = 5.39
```

## 14. FAQ

### Why is a high CVSS vulnerability not always the top priority?

CVSS is only one signal. CRQ also considers exploitability evidence, KEV
membership, asset context, application concentration, and business service
criticality. A lower CVSS issue on a public production system with sensitive
data can legitimately deserve more attention than a higher CVSS issue on a low
context asset.

### Can asset context create risk when there are no findings?

No. Asset context adjusts finding-driven risk. If an asset has no CRQ-scored
findings, final asset risk is `0.0`.

### Why can final asset or application risk be lower than the aggregate?

Context is implemented as a multiplier from `0.7` to `1.0`. This lets context
reduce urgency for lower-context systems while preventing context from inflating
the final score above the underlying vulnerability pressure.

### Why add unified remediation priority?

Risk scores explain where vulnerability pressure exists. Unified remediation
priority ranks individual findings by combining finding risk, asset context,
and business criticality so remediation teams can sort by one urgency score
instead of CVSS or service risk alone.

### How often are scores recalculated?

The current API does not recalculate scores live. Scores are recalculated by
manual scripts and Make targets. EPSS and KEV enrichment can be refreshed by
automation, but scoring still needs to be rerun afterward for persisted CRQ
scores to reflect new enrichment data.

## 15. Source References

Implementation:

- `backend/app/services/scoring/crq_finding.py`
- `backend/app/services/scoring/crq_asset.py`
- `backend/app/services/scoring/crq_application.py`
- `backend/app/services/scoring/crq_business_service.py`
- `backend/app/api/common.py`

Tests:

- `backend/tests/services/scoring/test_crq_finding_scoring.py`
- `backend/tests/services/scoring/test_crq_asset_scoring.py`
- `backend/tests/services/scoring/test_crq_application_scoring.py`
- `backend/tests/services/scoring/test_crq_business_service_scoring.py`

Operational commands:

- `Makefile`
- `backend/scripts/manual/score_crq_findings_v1.py`
- `backend/scripts/manual/score_crq_assets_v2.py`
- `backend/scripts/manual/score_crq_applications_v2.py`
- `backend/scripts/manual/score_crq_business_services_v1.py`
