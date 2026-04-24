# CRQ Finding Scoring V1

This document is retained as the superseded v1 model reference.

CRQ v1 has been replaced by CRQ v2 because the v1 age bonus materially over-promoted older findings into `Critical`.

CRQ v1 is a manual-run scoring pass that writes a local application score onto `public.findings`.

Schema changes are managed by the tracked Supabase migration in [supabase/migrations/20260423053000_add_crq_fields_to_findings.sql](/Users/axtopani/Documents/GitHub/VulnContext-Desktop/supabase/migrations/20260423053000_add_crq_fields_to_findings.sql). The scoring script assumes those columns already exist.

## Formula

`crq_score = min(10, cvss_score * epss_multiplier + kev_bonus + age_bonus)`

Inputs:

- `cvss_score` from `public.nvd.cvss_score`
- `epss_score` and `epss_percentile` from `public.epss_scores`
- `is_kev` from `public.kev`
- `age_in_days` from `public.findings.age_in_days`

EPSS multiplier bands:

- `<= 0.50` => `1.00`
- `<= 0.80` => `1.10`
- `<= 0.95` => `1.20`
- `<= 0.99` => `1.30`
- `> 0.99` => `1.50`

KEV bonus:

- `2.0` when the CVE is present in `public.kev`
- `0.0` otherwise

Age bonus:

- `<= 30` => `0.0`
- `<= 90` => `0.25`
- `<= 180` => `0.5`
- `> 180` => `1.0`

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

## Missing Data Behavior

- Missing `NVD` CVSS defaults `cvss_score` to `0.0` and records that in `crq_notes`.
- Missing `EPSS` defaults `epss_multiplier` to `1.0` and records that in `crq_notes`.
- Missing `KEV` defaults `kev_bonus` to `0.0`.
- Missing `age_in_days` defaults `age_bonus` to `0.0` and records that in `crq_notes`.

## Run

From repo root:

```bash
make score-crq-v1
```

Migration prerequisite:

```bash
apply supabase/migrations/20260423053000_add_crq_fields_to_findings.sql to the target project first
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

The script is intentionally manual-run only in v1.
