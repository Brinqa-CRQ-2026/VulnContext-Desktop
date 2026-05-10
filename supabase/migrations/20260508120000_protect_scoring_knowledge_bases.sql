create or replace function public.prevent_scoring_knowledge_base_delete()
returns trigger
language plpgsql
as $$
begin
  if current_setting('vulncontext.allow_knowledge_base_delete', true) = 'true' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return null;
  end if;

  raise exception
    'Refusing % on %.%. Set vulncontext.allow_knowledge_base_delete=true in the current transaction for intentional maintenance.',
    tg_op,
    tg_table_schema,
    tg_table_name;
end;
$$;

drop trigger if exists prevent_nvd_delete on public.nvd;
create trigger prevent_nvd_delete
before delete on public.nvd
for each row
execute function public.prevent_scoring_knowledge_base_delete();

drop trigger if exists prevent_nvd_truncate on public.nvd;
create trigger prevent_nvd_truncate
before truncate on public.nvd
for each statement
execute function public.prevent_scoring_knowledge_base_delete();

drop trigger if exists prevent_epss_scores_delete on public.epss_scores;
create trigger prevent_epss_scores_delete
before delete on public.epss_scores
for each row
execute function public.prevent_scoring_knowledge_base_delete();

drop trigger if exists prevent_epss_scores_truncate on public.epss_scores;
create trigger prevent_epss_scores_truncate
before truncate on public.epss_scores
for each statement
execute function public.prevent_scoring_knowledge_base_delete();

drop trigger if exists prevent_kev_delete on public.kev;
create trigger prevent_kev_delete
before delete on public.kev
for each row
execute function public.prevent_scoring_knowledge_base_delete();

drop trigger if exists prevent_kev_truncate on public.kev;
create trigger prevent_kev_truncate
before truncate on public.kev
for each statement
execute function public.prevent_scoring_knowledge_base_delete();
