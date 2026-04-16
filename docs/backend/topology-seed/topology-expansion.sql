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
  uid text,
  uuid text,
  name text not null,
  slug text not null unique,
  description text,
  owner text,
  data_integration text,
  connector text,
  connector_category text,
  data_model text,
  last_integration_transaction_id text,
  flow_state text,
  created_by text,
  updated_by text,
  source_last_modified_at timestamptz,
  source_last_integrated_at timestamptz,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  uid text,
  uuid text,
  name text not null,
  slug text not null,
  description text,
  criticality_label text,
  division text,
  manager text,
  data_integration text,
  connector text,
  connector_category text,
  data_model text,
  last_integration_transaction_id text,
  flow_state text,
  created_by text,
  updated_by text,
  source_last_modified_at timestamptz,
  source_last_integrated_at timestamptz,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_unit_id, slug)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  business_service_id uuid not null references public.business_services(id) on delete cascade,
  name text not null,
  slug text not null,
  first_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_service_id, slug)
);

alter table public.assets
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists business_unit_id uuid references public.business_units(id) on delete set null,
  add column if not exists business_service_id uuid references public.business_services(id) on delete set null,
  add column if not exists application_id uuid references public.applications(id) on delete set null;

create index if not exists idx_assets_business_unit_id on public.assets (business_unit_id);
create index if not exists idx_assets_business_service_id on public.assets (business_service_id);
create index if not exists idx_assets_application_id on public.assets (application_id);
create index if not exists idx_business_services_business_unit_id on public.business_services (business_unit_id);
create index if not exists idx_applications_business_service_id on public.applications (business_service_id);

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
    application_id = app.id
from public.business_services bs
join public.business_units bu on bu.id = bs.business_unit_id
left join public.companies c on c.id = bu.company_id
left join public.applications app
  on app.business_service_id = bs.id
 and app.name = a.application
where a.business_service = bs.name;

-- Assets with a business service but no application keep application_id null.
