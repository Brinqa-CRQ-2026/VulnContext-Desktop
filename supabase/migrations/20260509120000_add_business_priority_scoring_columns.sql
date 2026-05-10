alter table public.business_services
  add column if not exists business_criticality_score smallint,
  add column if not exists crq_business_service_priority_score numeric(5,2);

alter table public.business_units
  add column if not exists crq_business_unit_risk_score numeric(5,2),
  add column if not exists crq_business_unit_priority_score numeric(5,2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_services_business_criticality_score_range'
      and conrelid = 'public.business_services'::regclass
  ) then
    alter table public.business_services
      add constraint business_services_business_criticality_score_range
      check (
        business_criticality_score is null
        or business_criticality_score between 0 and 5
      );
  end if;
end $$;

create index if not exists business_services_crq_business_service_priority_score_idx
  on public.business_services (crq_business_service_priority_score desc);

create index if not exists business_units_crq_business_unit_risk_score_idx
  on public.business_units (crq_business_unit_risk_score desc);

create index if not exists business_units_crq_business_unit_priority_score_idx
  on public.business_units (crq_business_unit_priority_score desc);
