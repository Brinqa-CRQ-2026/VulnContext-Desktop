alter table public.applications
  add column if not exists crq_application_aggregated_asset_risk numeric(5,2),
  add column if not exists crq_application_compliance_score numeric(5,2),
  add column if not exists crq_application_risk_score numeric(5,2),
  add column if not exists crq_application_asset_count integer,
  add column if not exists crq_application_finding_count integer,
  add column if not exists crq_application_scored_at timestamp;

create index if not exists applications_crq_application_risk_score_idx
  on public.applications (crq_application_risk_score desc);
