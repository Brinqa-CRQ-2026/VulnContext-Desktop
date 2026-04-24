# CRQ Finding Scoring V2

CRQ v2 is the current manual-run scoring model for `public.findings`.

This version replaces the v1 additive age-based model because the imported dataset contains many very old findings and the age bonus was promoting too many rows into `Critical`.

Schema changes are managed by the tracked Supabase migration in [supabase/migrations/20260423053000_add_crq_fields_to_findings.sql](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/supabase/migrations/20260423053000_add_crq_fields_to_findings.sql). The scoring script assumes those columns already exist.

## Formula

`crq_score = min(10, cvss_component + epss_component + kev_component)`

Components:

- `cvss_component = nvd.cvss_score * 0.88`
- `epss_component = epss_scores.percentile * epss_weight`
- `kev_component = 0.9` when `kev.cve is not null`, else `0.0`

EPSS weight:

- `cvss_score >= 9.0` => `0.40`
- `cvss_score >= 8.0 and < 9.0` => `0.70`
- `cvss_score < 8.0` => `1.00`

Age handling:

- `findings.age_in_days` is still copied into `crq_age_days`
- the legacy age reference band is still copied into `crq_age_bonus`
- age is excluded from the CRQ v2 score

Risk bands:

- `>= 9.0` => `Critical`
- `>= 7.0` => `High`
- `>= 4.0` => `Medium`
- `< 4.0` => `Low`

## Persisted Fields

The scorer writes these columns on `public.findings`:

- `crq_score`
- `crq_risk_band`
- `crq_scored_at`
- `crq_score_version`
- `crq_cvss_score`
- `crq_epss_score`
- `crq_epss_percentile`
- `crq_epss_multiplier`
- `crq_is_kev`
- `crq_kev_bonus`
- `crq_age_days`
- `crq_age_bonus`
- `crq_notes`

Field meaning changes in v2:

- `crq_epss_multiplier` stores the effective EPSS weight for the score
- `crq_kev_bonus` stores the KEV additive weight of `0.9`
- `crq_age_bonus` is reference-only and is not part of the score

## Missing Data Behavior

- Missing `NVD` CVSS defaults the CVSS input to `0.0` and records that in `crq_notes`
- Missing `EPSS percentile` defaults the EPSS contribution to `0.0` and records that in `crq_notes`
- Missing `KEV` defaults the KEV contribution to `0.0`
- Missing `age_in_days` defaults the reference age band to `0.0` and records that in `crq_notes`

## Run

From repo root:

```bash
make score-crq-v2
```

Direct script usage:

```bash
cd backend
python3 scripts/score_findings_crq_v1.py
```

Optional preview mode:

```bash
cd backend
python3 scripts/score_findings_crq_v1.py --dry-run
```

Optional targeted run:

```bash
cd backend
python3 scripts/score_findings_crq_v1.py --finding-id finding-123
```
