alter table public.findings
  add column if not exists crq_finding_priority_score double precision;

create index if not exists ix_findings_crq_finding_priority_score
  on public.findings (crq_finding_priority_score desc);
