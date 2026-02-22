# app/models.py
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime
from app.core.db import Base

class ScoredFinding(Base):
    __tablename__ = "scored_findings"

    id = Column(Integer, primary_key=True, index=True)

    # Identity / asset context
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
    
    # Resolution status
    resolved = Column(Boolean, nullable=False, default=False)
    resolved_at = Column(DateTime, nullable=True)