# app/models.py
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from app.core.db import Base


class ScoredFinding(Base):
    __tablename__ = "scored_findings"

    id = Column(Integer, primary_key=True, index=True)

    # Import/source label retained for app-level grouping.
    source = Column(String, nullable=False, default="unknown", index=True)

    # Canonical finding identity from the staged Brinqa/Wiz dataset.
    uid = Column(String, nullable=True, index=True)
    record_id = Column(String, nullable=True, index=True)
    display_name = Column(String, nullable=True)
    cve_id = Column(String, nullable=True, index=True)
    cwe_ids = Column(Text, nullable=True)
    cve_ids = Column(Text, nullable=True)
    cve_record_names = Column(Text, nullable=True)
    status = Column(String, nullable=True, index=True)
    status_category = Column(String, nullable=True, index=True)
    source_status = Column(String, nullable=True, index=True)
    compliance_status = Column(String, nullable=True, index=True)
    severity = Column(String, nullable=True, index=True)
    risk_factor_names = Column(Text, nullable=True)
    risk_factor_values = Column(Text, nullable=True)
    age_in_days = Column(Float, nullable=True, index=True)
    first_found = Column(DateTime, nullable=True)
    last_found = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True, index=True)
    cisa_due_date_expired = Column(Boolean, nullable=True, index=True)
    target_count = Column(Integer, nullable=True)
    target_ids = Column(Text, nullable=True)
    target_names = Column(Text, nullable=True)
    asset_criticality = Column(Integer, nullable=True, index=True)
    context_score = Column(Float, nullable=True)
    attack_pattern_names = Column(Text, nullable=True)
    attack_technique_names = Column(Text, nullable=True)
    attack_tactic_names = Column(Text, nullable=True)
    cvss_score = Column(Float, nullable=True, index=True)
    cvss_vector = Column(String, nullable=True)
    cvss_version = Column(String, nullable=True)
    cvss_severity = Column(String, nullable=True, index=True)
    attack_vector = Column(String, nullable=True)
    attack_complexity = Column(String, nullable=True)
    epss_score = Column(Float, nullable=True, index=True)
    epss_percentile = Column(Float, nullable=True)
    is_kev = Column(Boolean, nullable=False, default=False, index=True)
    kev_date_added = Column(DateTime, nullable=True)
    kev_due_date = Column(DateTime, nullable=True)
    kev_vendor_project = Column(String, nullable=True)
    kev_product = Column(String, nullable=True)
    kev_vulnerability_name = Column(String, nullable=True)
    kev_short_description = Column(Text, nullable=True)
    kev_required_action = Column(Text, nullable=True)
    kev_ransomware_use = Column(String, nullable=True)
    base_risk_score = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=True, index=True)
    risk_rating = Column(String, nullable=True, index=True)
    record_link = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    type_display_name = Column(String, nullable=True)
    type_id = Column(String, nullable=True, index=True)
    date_created = Column(DateTime, nullable=True)
    last_updated = Column(DateTime, nullable=True)
    sla_days = Column(Float, nullable=True)
    sla_level = Column(String, nullable=True, index=True)
    risk_owner_name = Column(String, nullable=True)
    remediation_owner_name = Column(String, nullable=True)
    source_count = Column(Integer, nullable=True)
    source_uids = Column(Text, nullable=True)
    source_record_uids = Column(Text, nullable=True)
    source_links = Column(Text, nullable=True)
    connector_names = Column(Text, nullable=True)
    source_connector_names = Column(Text, nullable=True)
    connector_categories = Column(Text, nullable=True)
    data_integration_titles = Column(Text, nullable=True)
    informed_user_names = Column(Text, nullable=True)
    data_model_name = Column(String, nullable=True, index=True)
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    risk_scoring_model_name = Column(String, nullable=True)
    sla_definition_name = Column(String, nullable=True)
    confidence = Column(String, nullable=True)
    risk_factor_offset = Column(Float, nullable=True)
    category_count = Column(Integer, nullable=True)
    categories = Column(Text, nullable=True)

    # App-owned analyst fields, kept distinct from imported/vendor values.
    internal_risk_score = Column(Float, nullable=True, index=True)
    internal_risk_band = Column(String, nullable=True, index=True)
    internal_risk_notes = Column(Text, nullable=True)
    remediation_summary = Column(Text, nullable=True)
    remediation_plan = Column(Text, nullable=True)
    remediation_notes = Column(Text, nullable=True)
    remediation_status = Column(String, nullable=True, index=True)
    remediation_due_date = Column(DateTime, nullable=True, index=True)
    remediation_updated_at = Column(DateTime, nullable=True)
    remediation_updated_by = Column(String, nullable=True)

    # Transitional compatibility fields left in place until the API/UI rewrite.
    risk_band = Column(String, nullable=True, index=True)
    lifecycle_status = Column(String, nullable=True, index=True)
    finding_key = Column(String, nullable=True, index=True)
    is_present_in_latest_scan = Column(Boolean, nullable=False, default=True, index=True)
    first_seen_at = Column(DateTime, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    fixed_at = Column(DateTime, nullable=True)
    status_changed_at = Column(DateTime, nullable=True)
    last_scan_run_id = Column(Integer, nullable=True, index=True)

    # Manual triage / disposition (phase 1 simple in-table model)
    disposition = Column(String, nullable=False, default="none", index=True)
    disposition_state = Column(String, nullable=True)
    disposition_reason = Column(String, nullable=True)
    disposition_comment = Column(Text, nullable=True)
    disposition_created_at = Column(DateTime, nullable=True)
    disposition_expires_at = Column(DateTime, nullable=True)
    disposition_created_by = Column(String, nullable=True)


class RiskScoringConfig(Base):
    __tablename__ = "risk_scoring_config"

    id = Column(Integer, primary_key=True, index=True)
    cvss_weight = Column(Float, nullable=False, default=0.30)
    epss_weight = Column(Float, nullable=False, default=0.25)
    kev_weight = Column(Float, nullable=False, default=0.25)
    asset_criticality_weight = Column(Float, nullable=False, default=0.15)
    context_weight = Column(Float, nullable=False, default=0.05)

class EpssScore(Base):
    __tablename__ = "epss_scores"

    cve_id = Column(String(32), primary_key=True, index=True)
    probability = Column(Float, nullable=False)
    percentile = Column(Float, nullable=False)


class NvdCveCache(Base):
    __tablename__ = "nvd_cve_cache"

    cve_id = Column(String(32), primary_key=True, index=True)
    source_identifier = Column(String, nullable=True)
    vuln_status = Column(String, nullable=True)
    published = Column(DateTime, nullable=True, index=True)
    last_modified = Column(DateTime, nullable=True, index=True)
    description = Column(Text, nullable=True)
    cwe_ids = Column(Text, nullable=True)
    reference_urls = Column(Text, nullable=True)

    cvss_score = Column(Float, nullable=True, index=True)
    cvss_vector = Column(String, nullable=True)
    cvss_version = Column(String, nullable=True)
    cvss_severity = Column(String, nullable=True, index=True)
    attack_vector = Column(String, nullable=True)
    attack_complexity = Column(String, nullable=True)

    cisa_exploit_add = Column(DateTime, nullable=True, index=True)
    cisa_action_due = Column(DateTime, nullable=True)
    cisa_required_action = Column(Text, nullable=True)
    cisa_vulnerability_name = Column(String, nullable=True)
    has_kev = Column(Boolean, nullable=False, default=False, index=True)


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, nullable=False, index=True)
    scanner_type = Column(String, nullable=False, default="qualys", index=True)
    scanner_run_id = Column(String, nullable=True, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    imported_at = Column(DateTime, nullable=False, index=True)
    status = Column(String, nullable=False, default="success", index=True)

    total_rows_seen = Column(Integer, nullable=False, default=0)
    total_new = Column(Integer, nullable=False, default=0)
    total_reopened = Column(Integer, nullable=False, default=0)
    total_fixed = Column(Integer, nullable=False, default=0)
    total_active_after = Column(Integer, nullable=False, default=0)


class FindingEvent(Base):
    __tablename__ = "finding_events"

    id = Column(Integer, primary_key=True, index=True)
    finding_key = Column(String, nullable=False, index=True)
    scored_finding_id = Column(Integer, nullable=True, index=True)
    scan_run_id = Column(Integer, nullable=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    event_at = Column(DateTime, nullable=False, index=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    actor = Column(String, nullable=False, default="system")
    source = Column(String, nullable=True, index=True)
