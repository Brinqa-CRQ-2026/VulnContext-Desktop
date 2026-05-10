alter table public.business_services
  add column if not exists crq_business_service_aggregated_application_risk numeric(5,2),
  add column if not exists crq_business_service_aggregated_direct_asset_risk numeric(5,2),
  add column if not exists crq_business_service_risk_score numeric(5,2),
  add column if not exists crq_business_service_application_count integer,
  add column if not exists crq_business_service_asset_count integer,
  add column if not exists crq_business_service_finding_count integer,
  add column if not exists crq_business_service_scored_at timestamp;

create index if not exists business_services_crq_business_service_risk_score_idx
  on public.business_services (crq_business_service_risk_score desc);
