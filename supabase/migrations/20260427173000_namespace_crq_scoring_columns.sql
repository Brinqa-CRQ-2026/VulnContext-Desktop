do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_score'
  ) then
    alter table public.findings rename column crq_score to crq_finding_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_risk_band'
  ) then
    alter table public.findings rename column crq_risk_band to crq_finding_risk_band;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_scored_at'
  ) then
    alter table public.findings rename column crq_scored_at to crq_finding_scored_at;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_score_version'
  ) then
    alter table public.findings rename column crq_score_version to crq_finding_score_version;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_cvss_score'
  ) then
    alter table public.findings rename column crq_cvss_score to crq_finding_cvss_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_epss_score'
  ) then
    alter table public.findings rename column crq_epss_score to crq_finding_epss_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_epss_percentile'
  ) then
    alter table public.findings rename column crq_epss_percentile to crq_finding_epss_percentile;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_epss_multiplier'
  ) then
    alter table public.findings rename column crq_epss_multiplier to crq_finding_epss_multiplier;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_is_kev'
  ) then
    alter table public.findings rename column crq_is_kev to crq_finding_is_kev;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_kev_bonus'
  ) then
    alter table public.findings rename column crq_kev_bonus to crq_finding_kev_bonus;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_age_days'
  ) then
    alter table public.findings rename column crq_age_days to crq_finding_age_days;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_age_bonus'
  ) then
    alter table public.findings rename column crq_age_bonus to crq_finding_age_bonus;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findings'
      and column_name = 'crq_notes'
  ) then
    alter table public.findings rename column crq_notes to crq_finding_notes;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'aggregated_finding_risk'
  ) then
    alter table public.assets rename column aggregated_finding_risk to crq_asset_aggregated_finding_risk;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'exposure_modifier'
  ) then
    alter table public.assets rename column exposure_modifier to crq_asset_exposure_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'exposure_score'
  ) then
    alter table public.assets rename column exposure_score to crq_asset_exposure_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'data_sensitivity_modifier'
  ) then
    alter table public.assets rename column data_sensitivity_modifier to crq_asset_data_sensitivity_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'data_sensitivity_score'
  ) then
    alter table public.assets rename column data_sensitivity_score to crq_asset_data_sensitivity_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'environment_modifier'
  ) then
    alter table public.assets rename column environment_modifier to crq_asset_environment_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'environment_score'
  ) then
    alter table public.assets rename column environment_score to crq_asset_environment_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'asset_type_modifier'
  ) then
    alter table public.assets rename column asset_type_modifier to crq_asset_type_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'asset_type_score'
  ) then
    alter table public.assets rename column asset_type_score to crq_asset_type_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'asset_context_multiplier'
  ) then
    alter table public.assets rename column asset_context_multiplier to crq_asset_context_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'asset_context_score'
  ) then
    alter table public.assets rename column asset_context_score to crq_asset_context_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'asset_risk_score'
  ) then
    alter table public.assets rename column asset_risk_score to crq_asset_risk_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'scored_at'
  ) then
    alter table public.assets rename column scored_at to crq_asset_scored_at;
  end if;
end $$;

drop index if exists public.findings_crq_score_idx;
drop index if exists public.findings_crq_risk_band_idx;
drop index if exists public.findings_asset_id_crq_is_kev_idx;
drop index if exists public.findings_asset_id_crq_risk_band_idx;
drop index if exists public.findings_asset_id_display_score_desc_idx;
drop index if exists public.findings_crq_finding_score_idx;
drop index if exists public.findings_crq_finding_risk_band_idx;
drop index if exists public.findings_asset_id_crq_finding_is_kev_idx;
drop index if exists public.findings_asset_id_crq_finding_risk_band_idx;
drop index if exists public.findings_asset_id_display_crq_finding_score_desc_idx;

create index if not exists findings_crq_finding_score_idx
  on public.findings (crq_finding_score desc);

create index if not exists findings_crq_finding_risk_band_idx
  on public.findings (crq_finding_risk_band);

create index if not exists findings_asset_id_crq_finding_is_kev_idx
  on public.findings (asset_id, crq_finding_is_kev);

create index if not exists findings_asset_id_crq_finding_risk_band_idx
  on public.findings (asset_id, crq_finding_risk_band);

create index if not exists findings_asset_id_display_crq_finding_score_desc_idx
  on public.findings (asset_id, (coalesce(crq_finding_score, brinqa_risk_score)) desc, id desc);
