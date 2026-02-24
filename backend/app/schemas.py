from datetime import datetime

from pydantic import BaseModel, Field


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
    cve_id: str | None = None
    is_kev: bool = False


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
    is_kev: bool = Field(default=False, serialization_alias="isKev")
    kev_date_added: datetime | None = Field(default=None, serialization_alias="kevDateAdded")
    kev_due_date: datetime | None = Field(default=None, serialization_alias="kevDueDate")
    sla_hours: int | None = Field(default=None, serialization_alias="slaHours")
    kev_vendor_project: str | None = Field(default=None, serialization_alias="kevVendorProject")
    kev_product: str | None = Field(default=None, serialization_alias="kevProduct")
    kev_vulnerability_name: str | None = Field(
        default=None,
        serialization_alias="kevVulnerabilityName",
    )
    kev_short_description: str | None = Field(
        default=None,
        serialization_alias="kevShortDescription",
    )
    kev_required_action: str | None = Field(
        default=None,
        serialization_alias="kevRequiredAction",
    )
    kev_ransomware_use: str | None = Field(
        default=None,
        serialization_alias="kevRansomwareUse",
    )

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

    finding_key: str | None = None
    lifecycle_status: str | None = None
    is_present_in_latest_scan: bool | None = None
    first_seen_at: datetime | None = None
    last_seen_at: datetime | None = None
    fixed_at: datetime | None = None
    status_changed_at: datetime | None = None
    last_scan_run_id: int | None = None

    disposition: str | None = None
    disposition_state: str | None = None
    disposition_reason: str | None = None
    disposition_comment: str | None = None
    disposition_created_at: datetime | None = None
    disposition_expires_at: datetime | None = None
    disposition_created_by: str | None = None

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
    kev_findings_total: int = Field(default=0, serialization_alias="kevFindingsTotal")
    kev_risk_bands: RiskBandSummary = Field(
        default_factory=RiskBandSummary,
        serialization_alias="kevRiskBands",
    )


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


class FindingDispositionUpdateRequest(BaseModel):
    disposition: str
    reason: str | None = None
    comment: str | None = None
    expires_at: datetime | None = None
    actor: str | None = None


class FindingDispositionResult(BaseModel):
    id: int
    finding_id: str
    disposition: str
    disposition_state: str | None = None
    disposition_reason: str | None = None
    disposition_comment: str | None = None
    disposition_created_at: datetime | None = None
    disposition_expires_at: datetime | None = None
    disposition_created_by: str | None = None


class KevReenrichRequest(BaseModel):
    csv_path: str


class KevReenrichResult(BaseModel):
    csv_path: str
    updated_rows: int
    kev_rows_marked: int
    kev_rows_cleared: int
