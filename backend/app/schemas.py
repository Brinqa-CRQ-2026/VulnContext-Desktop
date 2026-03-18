from datetime import datetime

from pydantic import BaseModel, Field


class ScoredFindingOut(BaseModel):
    id: int
    source: str

    uid: str | None = None
    record_id: str | None = None
    display_name: str | None = None
    record_link: str | None = None

    status: str | None = None
    status_category: str | None = None
    source_status: str | None = None
    compliance_status: str | None = None
    severity: str | None = None
    lifecycle_status: str | None = None

    age_in_days: float | None = None
    first_found: datetime | None = None
    last_found: datetime | None = None
    due_date: datetime | None = None
    fixed_at: datetime | None = None
    status_changed_at: datetime | None = None
    cisa_due_date_expired: bool | None = None

    target_count: int | None = None
    target_ids: str | None = None
    target_names: str | None = None

    cve_id: str | None = None
    cve_ids: str | None = None
    cve_record_names: str | None = None
    cwe_ids: str | None = None

    cvss_score: float | None = None
    cvss_version: str | None = None
    cvss_severity: str | None = None
    cvss_vector: str | None = None
    attack_vector: str | None = None
    attack_complexity: str | None = None
    epss_score: float | None = None
    epss_percentile: float | None = None

    is_kev: bool = Field(default=False, serialization_alias="isKev")
    kev_date_added: datetime | None = Field(default=None, serialization_alias="kevDateAdded")
    kev_due_date: datetime | None = Field(default=None, serialization_alias="kevDueDate")
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

    risk_score: float | None = None
    risk_band: str | None = None
    source_risk_score: float | None = None
    source_risk_band: str | None = None
    source_risk_rating: str | None = None
    base_risk_score: float | None = None
    internal_risk_score: float | None = None
    internal_risk_band: str | None = None
    internal_risk_notes: str | None = None

    asset_criticality: int | None = None
    context_score: float | None = None
    risk_factor_names: str | None = None
    risk_factor_values: str | None = None
    risk_factor_offset: float | None = None

    summary: str | None = None
    description: str | None = None
    cve_description: str | None = Field(default=None, serialization_alias="cveDescription")
    type_display_name: str | None = None
    type_id: str | None = None
    attack_pattern_names: str | None = None
    attack_technique_names: str | None = None
    attack_tactic_names: str | None = None

    sla_days: float | None = None
    sla_level: str | None = None
    risk_owner_name: str | None = None
    remediation_owner_name: str | None = None

    source_count: int | None = None
    source_uids: str | None = None
    source_record_uids: str | None = None
    source_links: str | None = None
    connector_names: str | None = None
    source_connector_names: str | None = None
    connector_categories: str | None = None
    data_integration_titles: str | None = None
    informed_user_names: str | None = None
    data_model_name: str | None = None
    created_by: str | None = None
    updated_by: str | None = None
    date_created: datetime | None = None
    last_updated: datetime | None = None
    risk_scoring_model_name: str | None = None
    sla_definition_name: str | None = None
    confidence: str | None = None
    category_count: int | None = None
    categories: str | None = None

    remediation_summary: str | None = None
    remediation_plan: str | None = None
    remediation_notes: str | None = None
    remediation_status: str | None = None
    remediation_due_date: datetime | None = None
    remediation_updated_at: datetime | None = None
    remediation_updated_by: str | None = None

    disposition: str | None = None
    disposition_state: str | None = None
    disposition_reason: str | None = None
    disposition_comment: str | None = None
    disposition_created_at: datetime | None = None
    disposition_expires_at: datetime | None = None
    disposition_created_by: str | None = None


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
    cvss_weight: float = 0.40
    epss_weight: float = 0.25
    kev_weight: float = 0.25
    asset_criticality_weight: float = 0.15
    context_weight: float = 0.20


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
    uid: str | None = None
    record_id: str | None = None
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
