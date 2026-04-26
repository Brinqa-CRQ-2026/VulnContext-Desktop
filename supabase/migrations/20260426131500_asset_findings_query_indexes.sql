create index if not exists findings_asset_id_id_desc_idx
  on public.findings (asset_id, id desc);

create index if not exists findings_asset_id_crq_is_kev_idx
  on public.findings (asset_id, crq_is_kev);

create index if not exists findings_asset_id_age_desc_idx
  on public.findings (asset_id, age_in_days desc);

create index if not exists findings_asset_id_crq_risk_band_idx
  on public.findings (asset_id, crq_risk_band);

create index if not exists findings_asset_id_display_score_desc_idx
  on public.findings (asset_id, (coalesce(crq_score, brinqa_risk_score)) desc, id desc);
