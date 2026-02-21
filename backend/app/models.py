# app/models.py
from sqlalchemy import Column, Integer, String, Float, Boolean, Text
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

