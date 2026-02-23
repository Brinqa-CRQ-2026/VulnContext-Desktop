from datetime import datetime

from pydantic import BaseModel


class ScoredFindingCreate(BaseModel):
    """
    Input schema: what the client sends when it wants a finding scored.
    Note: no id, no risk_score, no risk_band here – those are computed.
    """
    finding_id: str
    asset_id: str
    cvss_score: float
    epss_score: float
    internet_exposed: bool
    asset_criticality: int


class ScoredFindingBase(ScoredFindingCreate):
    """
    Base schema shared by output types that include computed fields.
    """
    risk_score: float
    risk_band: str



class ScoredFindingOut(BaseModel):
    id: int

    finding_id: str
    asset_id: str
    hostname: str | None = None
    ip_address: str | None = None
    operating_system: str | None = None
    asset_type: str | None = None

    asset_criticality: int

    cve_id: str | None = None
    cwe_id: str | None = None
    description: str | None = None

    cvss_score: float
    cvss_severity: str | None = None
    epss_score: float

    attack_vector: str | None = None
    privileges_required: str | None = None
    user_interaction: str | None = None
    vector_string: str | None = None

    vuln_published_date: str | None = None
    vuln_age_days: int | None = None
    port: int | None = None
    service: str | None = None
    internet_exposed: bool
    auth_required: bool
    detection_method: str | None = None
    first_detected: str | None = None
    last_detected: str | None = None
    times_detected: int | None = None

    risk_score: float
    risk_band: str
    
    resolved: bool = False
    resolved_at: datetime | None = None

    class Config:
        from_attributes = True

class PaginatedFindings(BaseModel):
    items: list[ScoredFindingOut]
    total: int
    page: int
    page_size: int

class ResolveFindingUpdate(BaseModel):
    resolved: bool | None = None
    resolved_at: datetime | None = None

class RiskBandSummary(BaseModel):
    Critical: int = 0
    High: int = 0
    Medium: int = 0
    Low: int = 0


class ScoresSummary(BaseModel):
    total_findings: int
    risk_bands: RiskBandSummary


class RiskOverTimePoint(BaseModel):
    date: str
    total_risk: float
    resolved_count: int
    resolved_risk: float


class RiskOverTime(BaseModel):
    days: int
    points: list[RiskOverTimePoint]


class AssetVulnCount(BaseModel):
    asset_id: str
    hostname: str | None = None
    vuln_count: int
    total_risk: float