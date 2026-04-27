do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'exposure_modifier'
  ) then
    alter table public.assets rename column exposure_modifier to exposure_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'data_sensitivity_modifier'
  ) then
    alter table public.assets rename column data_sensitivity_modifier to data_sensitivity_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'environment_modifier'
  ) then
    alter table public.assets rename column environment_modifier to environment_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'asset_type_modifier'
  ) then
    alter table public.assets rename column asset_type_modifier to asset_type_score;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assets'
      and column_name = 'asset_context_multiplier'
  ) then
    alter table public.assets rename column asset_context_multiplier to asset_context_score;
  end if;
end $$;
