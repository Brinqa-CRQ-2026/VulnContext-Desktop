alter table public.findings
  add column if not exists crq_score double precision,
  add column if not exists crq_risk_band text,
  add column if not exists crq_scored_at timestamptz,
  add column if not exists crq_score_version text,
  add column if not exists crq_cvss_score double precision,
  add column if not exists crq_epss_score double precision,
  add column if not exists crq_epss_percentile double precision,
  add column if not exists crq_epss_multiplier double precision,
  add column if not exists crq_is_kev boolean,
  add column if not exists crq_kev_bonus double precision,
  add column if not exists crq_age_days double precision,
  add column if not exists crq_age_bonus double precision,
  add column if not exists crq_notes text;

create index if not exists findings_crq_score_idx on public.findings (crq_score desc);
create index if not exists findings_crq_risk_band_idx on public.findings (crq_risk_band);
