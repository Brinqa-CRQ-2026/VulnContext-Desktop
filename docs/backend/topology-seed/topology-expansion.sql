create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  source_id text,
  name text not null,
  slug text not null unique,
  description text,
  owner text,
  crq_business_unit_risk_score numeric(5,2),
  crq_business_unit_priority_score numeric(5,2),
  crq_business_unit_business_service_count integer,
  crq_business_unit_application_count integer,
  crq_business_unit_asset_count integer,
  crq_business_unit_finding_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  source_id text,
  name text not null,
  slug text not null,
  description text,
  criticality_label text,
  division text,
  manager text,
  business_criticality_score smallint,
  crq_business_service_aggregated_application_risk numeric(5,2),
  crq_business_service_aggregated_direct_asset_risk numeric(5,2),
  crq_business_service_risk_score numeric(5,2),
  crq_business_service_priority_score numeric(5,2),
  crq_business_service_application_count integer,
  crq_business_service_asset_count integer,
  crq_business_service_finding_count integer,
  crq_business_service_scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_services_business_criticality_score_range
    check (
      business_criticality_score is null
      or business_criticality_score between 0 and 5
    ),
  unique (business_unit_id, slug)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  business_service_id uuid not null references public.business_services(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  tags text[],
  first_seen_at timestamptz,
  crq_application_aggregated_asset_risk numeric(5,2),
  crq_application_compliance_score numeric(5,2),
  crq_application_risk_score numeric(5,2),
  crq_application_asset_count integer,
  crq_application_finding_count integer,
  crq_application_scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_service_id, slug)
);

alter table public.business_units
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists source_id text,
  add column if not exists description text,
  add column if not exists owner text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists crq_business_unit_risk_score numeric(5,2),
  add column if not exists crq_business_unit_priority_score numeric(5,2),
  add column if not exists crq_business_unit_business_service_count integer,
  add column if not exists crq_business_unit_application_count integer,
  add column if not exists crq_business_unit_asset_count integer,
  add column if not exists crq_business_unit_finding_count integer;

alter table public.business_services
  add column if not exists source_id text,
  add column if not exists description text,
  add column if not exists criticality_label text,
  add column if not exists division text,
  add column if not exists manager text,
  add column if not exists business_criticality_score smallint,
  add column if not exists crq_business_service_aggregated_application_risk numeric(5,2),
  add column if not exists crq_business_service_aggregated_direct_asset_risk numeric(5,2),
  add column if not exists crq_business_service_risk_score numeric(5,2),
  add column if not exists crq_business_service_priority_score numeric(5,2),
  add column if not exists crq_business_service_application_count integer,
  add column if not exists crq_business_service_asset_count integer,
  add column if not exists crq_business_service_finding_count integer,
  add column if not exists crq_business_service_scored_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'business_units' and column_name = 'uuid'
  ) then
    update public.business_units
    set source_id = coalesce(source_id, uuid)
    where source_id is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'business_units' and column_name = 'uid'
  ) then
    update public.business_units
    set source_id = coalesce(source_id, uid)
    where source_id is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'business_services' and column_name = 'uuid'
  ) then
    update public.business_services
    set source_id = coalesce(source_id, uuid)
    where source_id is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'business_services' and column_name = 'uid'
  ) then
    update public.business_services
    set source_id = coalesce(source_id, uid)
    where source_id is null;
  end if;
end $$;

alter table public.business_units
  drop column if exists uid,
  drop column if exists uuid,
  drop column if exists data_integration,
  drop column if exists connector,
  drop column if exists connector_category,
  drop column if exists data_model,
  drop column if exists last_integration_transaction_id,
  drop column if exists flow_state,
  drop column if exists created_by,
  drop column if exists updated_by,
  drop column if exists source_last_modified_at,
  drop column if exists source_last_integrated_at,
  drop column if exists source_created_at,
  drop column if exists source_updated_at;

alter table public.business_services
  drop column if exists uid,
  drop column if exists uuid,
  drop column if exists data_integration,
  drop column if exists connector,
  drop column if exists connector_category,
  drop column if exists data_model,
  drop column if exists last_integration_transaction_id,
  drop column if exists flow_state,
  drop column if exists created_by,
  drop column if exists updated_by,
  drop column if exists source_last_modified_at,
  drop column if exists source_last_integrated_at,
  drop column if exists source_created_at,
  drop column if exists source_updated_at;

alter table public.applications
  add column if not exists description text,
  add column if not exists tags text[],
  add column if not exists first_seen_at timestamptz,
  add column if not exists crq_application_aggregated_asset_risk numeric(5,2),
  add column if not exists crq_application_compliance_score numeric(5,2),
  add column if not exists crq_application_risk_score numeric(5,2),
  add column if not exists crq_application_asset_count integer,
  add column if not exists crq_application_finding_count integer,
  add column if not exists crq_application_scored_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

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

alter table public.assets
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists business_unit_id uuid references public.business_units(id) on delete set null,
  add column if not exists business_service_id uuid references public.business_services(id) on delete set null,
  add column if not exists application_id uuid references public.applications(id) on delete set null,
  add column if not exists crq_asset_finding_count integer;

alter table public.assets
  drop column if exists qualys_vm_host_uid,
  drop column if exists qualys_vm_host_integration,
  drop column if exists servicenow_host_uid,
  drop column if exists servicenow_host_integration;

create index if not exists idx_assets_business_unit_id on public.assets (business_unit_id);
create index if not exists idx_assets_business_service_id on public.assets (business_service_id);
create index if not exists idx_assets_application_id on public.assets (application_id);
create index if not exists assets_crq_asset_finding_count_idx on public.assets (crq_asset_finding_count desc);
create index if not exists idx_business_services_business_unit_id on public.business_services (business_unit_id);
create index if not exists business_units_source_id_idx on public.business_units (source_id);
create index if not exists business_services_source_id_idx on public.business_services (source_id);
create index if not exists business_services_crq_business_service_risk_score_idx on public.business_services (crq_business_service_risk_score desc);
create index if not exists business_services_crq_business_service_priority_score_idx on public.business_services (crq_business_service_priority_score desc);
create index if not exists idx_applications_business_service_id on public.applications (business_service_id);
create index if not exists applications_crq_application_risk_score_idx on public.applications (crq_application_risk_score desc);
create index if not exists business_units_crq_business_unit_risk_score_idx on public.business_units (crq_business_unit_risk_score desc);
create index if not exists business_units_crq_business_unit_priority_score_idx on public.business_units (crq_business_unit_priority_score desc);

alter table public.companies enable row level security;
alter table public.business_units enable row level security;
alter table public.business_services enable row level security;
alter table public.applications enable row level security;

-- Current access model is backend-managed only. No public Data API policies are created yet.
-- Add explicit policies before exposing these tables through Supabase client access.

insert into public.companies (name)
values ('Virtucon'), ('Cyberdyne Systems')
on conflict (name) do nothing;

-- Import docs/backend/topology-seed/business_units.csv, business_services.csv, and applications.csv
-- with the Supabase table editor import or via staging-table insert/selects in this order:
-- 1. companies
-- 2. business_units
-- 3. business_services
-- 4. applications
-- 5. asset FK backfill

update public.assets a
set company_id = c.id,
    business_unit_id = bu.id,
    business_service_id = bs.id,
    application_id = (
      select app.id
      from public.applications app
      where app.business_service_id = bs.id
        and app.name = a.application
      limit 1
    )
from public.business_services bs
join public.business_units bu on bu.id = bs.business_unit_id
left join public.companies c on c.id = bu.company_id
where a.business_service = bs.name;

-- Assets with a business service but no application keep application_id null.
