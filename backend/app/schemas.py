from pydantic import BaseModel


class ScoredFindingCreate(BaseModel):
    """
    Input schema: what the client sends when it wants a finding scored.
    Note: no id, no risk_score, no risk_band here – those are computed.
    """
    source: str = "manual"
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

    source: str
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

    class Config:
        from_attributes = True

class PaginatedFindings(BaseModel):
    items: list[ScoredFindingOut]
    total: int
    page: int
    page_size: int

class RiskBandSummary(BaseModel):
    Critical: int = 0
    High: int = 0
    Medium: int = 0
    Low: int = 0


class ScoresSummary(BaseModel):
    total_findings: int
    risk_bands: RiskBandSummary


class SeedUploadResult(BaseModel):
    inserted: int
    source: str
    total_findings: int


class SourceSummary(BaseModel):
    source: str
    total_findings: int
    risk_bands: RiskBandSummary


class SourceRenameRequest(BaseModel):
    new_source: str


class SourceRenameResult(BaseModel):
    old_source: str
    new_source: str
    updated_rows: int


class SourceDeleteResult(BaseModel):
    source: str
    deleted_rows: int
    total_findings_remaining: int


class RiskWeightsConfig(BaseModel):
    cvss_weight: float = 0.30
    epss_weight: float = 0.25
    internet_exposed_weight: float = 0.20
    asset_criticality_weight: float = 0.15
    vuln_age_weight: float = 0.10
    auth_required_weight: float = -0.10


class RiskWeightsUpdateResult(BaseModel):
    updated_rows: int
    weights: RiskWeightsConfig
