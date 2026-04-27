# CRQ Finding Scoring V4

CRQ v4 is the current manual-run scoring model for `public.findings`.

This version keeps CVSS as the primary driver, turns EPSS into a small bounded downward or upward adjustment, and keeps age as reference-only metadata until the dataset has trustworthy age values.

Schema changes are managed by the tracked Supabase migration in [supabase/migrations/20260423053000_add_crq_fields_to_findings.sql](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/supabase/migrations/20260423053000_add_crq_fields_to_findings.sql). The scoring script assumes those columns already exist.

## Formula

`crq_finding_score = min(10, (cvss_score * 0.88) + epss_adjustment + kev_bonus)`

Components:

- `cvss_score` comes from `nvd.cvss_score`
- `epss_adjustment` comes from `epss_scores.percentile`
- `kev_bonus` is `0.9` when `kev.cve is not null`, else `0.0`

EPSS percentile bands:

- `< 20` => `-0.40`
- `20-49` => `-0.15`
- `50-79` => `0.00`
- `80-94` => `+0.35`
- `95+` => `+0.75`

Stored EPSS percentiles are `0-1` values, so the scorer applies the same bands against `0.20`, `0.50`, `0.80`, and `0.95`.

Age handling:

- `findings.age_in_days` is still copied into `crq_finding_age_days`
- the legacy age reference band is still copied into `crq_finding_age_bonus`
- age is excluded from the CRQ v4 score
- for `cvss_score < 4.0`, negative EPSS adjustments are softened
- for missing or zero CVSS, negative EPSS adjustments are disabled

Risk bands:

- `>= 9.0` => `Critical`
- `>= 7.0` => `High`
- `>= 4.0` => `Medium`
- `< 4.0` => `Low`

## Persisted Fields

The scorer writes these columns on `public.findings`:

- `crq_finding_score`
- `crq_finding_risk_band`
- `crq_finding_scored_at`
- `crq_finding_score_version`
- `crq_finding_cvss_score`
- `crq_finding_epss_score`
- `crq_finding_epss_percentile`
- `crq_finding_epss_multiplier`
- `crq_finding_is_kev`
- `crq_finding_kev_bonus`
- `crq_finding_age_days`
- `crq_finding_age_bonus`
- `crq_finding_notes`

Field meaning notes in v4:

- `crq_finding_epss_multiplier` stores the effective EPSS adjustment amount for the final score
- `crq_finding_kev_bonus` stores the KEV additive bonus of `0.9`
- `crq_finding_age_bonus` is reference-only and is not part of the score

## Missing Data Behavior

- Missing `NVD` CVSS defaults the CVSS input to `0.0` and records that in `crq_finding_notes`
- Missing `EPSS percentile` defaults the EPSS adjustment to `0.0` and records that in `crq_finding_notes`
- Missing `KEV` defaults the KEV bonus to `0.0`
- Missing `age_in_days` defaults the reference age band to `0.0` and records that in `crq_finding_notes`

## Run

From repo root:

```bash
make score-crq-v4
```

Direct script usage:

```bash
cd backend
python3 scripts/score_crq_findings_v1.py
```

Optional preview mode:

```bash
cd backend
python3 scripts/score_crq_findings_v1.py --dry-run
```

Optional targeted run:

```bash
cd backend
python3 scripts/score_crq_findings_v1.py --finding-id finding-123
```
