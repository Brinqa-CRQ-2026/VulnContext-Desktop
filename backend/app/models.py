# app/models.py
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime
from app.core.db import Base

class ScoredFinding(Base):
    __tablename__ = "scored_findings"

    id = Column(Integer, primary_key=True, index=True)

    # Identity / asset context
    source = Column(String, nullable=False, default="unknown", index=True)
    finding_id = Column(String, index=True, nullable=False)
    asset_id = Column(String, index=True, nullable=False)
    hostname = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    operating_system = Column(String, nullable=True)
    asset_type = Column(String, nullable=True)

    # Asset criticality (numeric for analytics; label is in CSV & scoring)
    asset_criticality = Column(Integer, nullable=False)

    # Vulnerability identity
    cve_id = Column(String, nullable=True)
    cwe_id = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    is_kev = Column(Boolean, nullable=False, default=False, index=True)
    kev_date_added = Column(DateTime, nullable=True)
    kev_due_date = Column(DateTime, nullable=True)
    sla_hours = Column(Integer, nullable=True)
    kev_vendor_project = Column(String, nullable=True)
    kev_product = Column(String, nullable=True)
    kev_vulnerability_name = Column(String, nullable=True)
    kev_short_description = Column(Text, nullable=True)
    kev_required_action = Column(Text, nullable=True)
    kev_ransomware_use = Column(String, nullable=True)

    # Scores / severity
    cvss_score = Column(Float, nullable=False)
    cvss_severity = Column(String, nullable=True)
    epss_score = Column(Float, nullable=False)

    # Exploit / vector info
    attack_vector = Column(String, nullable=True)
    privileges_required = Column(String, nullable=True)
    user_interaction = Column(String, nullable=True)
    vector_string = Column(String, nullable=True)

    # Temporal context
    vuln_published_date = Column(String, nullable=True)
    vuln_age_days = Column(Integer, nullable=True)
    first_detected = Column(String, nullable=True)
    last_detected = Column(String, nullable=True)
    times_detected = Column(Integer, nullable=True)

    # Exposure / surface
    port = Column(Integer, nullable=True)
    service = Column(String, nullable=True)
    internet_exposed = Column(Boolean, nullable=False, default=False)
    auth_required = Column(Boolean, nullable=False, default=False)
    detection_method = Column(String, nullable=True)

    # Final risk scoring
    risk_score = Column(Float, nullable=False)
    risk_band = Column(String, nullable=False)

    # Lifecycle / scan reconciliation (phase 1)
    finding_key = Column(String, nullable=True, index=True)
    lifecycle_status = Column(String, nullable=False, default="active", index=True)
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
    internet_exposed_weight = Column(Float, nullable=False, default=0.20)
    asset_criticality_weight = Column(Float, nullable=False, default=0.15)
    vuln_age_weight = Column(Float, nullable=False, default=0.10)
    auth_required_weight = Column(Float, nullable=False, default=-0.10)

class EpssScore(Base):
    __tablename__ = "epss_scores"

    cve_id = Column(String(32), primary_key=True, index=True)
    probability = Column(Float, nullable=False)
    percentile = Column(Float, nullable=False)


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
