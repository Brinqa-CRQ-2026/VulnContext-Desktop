from datetime import datetime

from pydantic import BaseModel, Field


class FindingSummary(BaseModel):
    id: str
    source: str = "Brinqa"
    asset_id: str

    uid: str | None = None
    record_id: str | None = None
    display_name: str | None = None
    status: str | None = None
    compliance_status: str | None = None
    lifecycle_status: str | None = None
    age_in_days: float | None = None
    first_found: datetime | None = None
    last_found: datetime | None = None
    cve_id: str | None = None
    cwe_ids: str | None = None
    target_ids: str | None = None
    target_names: str | None = None
    cvss_score: float | None = None
    cvss_severity: str | None = None
    epss_score: float | None = None
    epss_percentile: float | None = None
    is_kev: bool = Field(default=False, serialization_alias="isKev")
    risk_score: float | None = None
    risk_band: str | None = None
    source_risk_score: float | None = None
    source_risk_band: str | None = None
    source_risk_rating: str | None = None
    base_risk_score: float | None = None
    score_source: str | None = None
    crq_score_version: str | None = None
    crq_scored_at: datetime | None = None
    asset_criticality: int | None = None


class FindingDetail(FindingSummary):
    asset_name: str | None = None
    summary: str | None = None
    description: str | None = None
    record_link: str | None = None
    source_status: str | None = None
    severity: str | None = None
    due_date: datetime | None = None
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
    cve_description: str | None = Field(default=None, serialization_alias="cveDescription")
    attack_pattern_names: str | None = None
    attack_technique_names: str | None = None
    attack_tactic_names: str | None = None
    risk_owner_name: str | None = None
    remediation_owner_name: str | None = None
    remediation_status: str | None = None
    internal_risk_notes: str | None = None
    crq_cvss_score: float | None = None
    crq_epss_score: float | None = None
    crq_epss_percentile: float | None = None
    crq_epss_multiplier: float | None = None
    crq_is_kev: bool = False
    crq_kev_bonus: float | None = None
    crq_age_days: float | None = None
    crq_age_bonus: float | None = None
    crq_notes: str | None = None
    detail_source: str | None = None
    detail_fetched_at: datetime | None = None


class PaginatedFindings(BaseModel):
    items: list[FindingSummary]
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


class TopologyMetrics(BaseModel):
    total_business_services: int = 0
    total_applications: int = 0
    total_assets: int = 0
    total_findings: int = 0


class CompanySummary(BaseModel):
    name: str


class BusinessUnitSummary(BaseModel):
    company: CompanySummary | None = None
    business_unit: str
    slug: str
    metrics: TopologyMetrics


class BusinessServiceSummary(BaseModel):
    business_service: str
    slug: str
    metrics: TopologyMetrics


class ApplicationSummary(BaseModel):
    application: str
    slug: str
    metrics: TopologyMetrics


class AssetSummary(BaseModel):
    asset_id: str
    hostname: str | None = None
    company: str | None = None
    business_unit: str | None = None
    application: str | None = None
    business_service: str | None = None
    status: str | None = None
    compliance_status: str | None = None
    asset_criticality: int | None = None
    tags: list[str] | None = None
    environment: str | None = None
    aggregated_finding_risk: float | None = None
    exposure_score: float | None = None
    data_sensitivity_score: float | None = None
    environment_score: float | None = None
    asset_type_score: float | None = None
    asset_context_score: float | None = None
    asset_risk_score: float | None = None
    scored_at: datetime | None = None
    device_type: str | None = None
    category: str | None = None
    compliance_flags: str | None = None
    pci: bool | None = None
    pii: bool | None = None
    finding_count: int = 0


class AssetDetail(AssetSummary):
    uid: str | None = None
    dnsname: str | None = None
    uuid: str | None = None
    tracking_method: str | None = None
    owner: str | None = None
    service_team: str | None = None
    division: str | None = None
    it_sme: str | None = None
    it_director: str | None = None
    location: str | None = None
    internal_or_external: str | None = None
    device_type: str | None = None
    category: str | None = None
    virtual_or_physical: str | None = None
    compliance_flags: str | None = None
    pci: bool | None = None
    pii: bool | None = None
    public_ip_addresses: str | None = None
    private_ip_addresses: str | None = None
    last_authenticated_scan: datetime | None = None
    last_scanned: datetime | None = None
    qualys_vm_host_id: str | None = None
    qualys_vm_host_uid: str | None = None
    qualys_vm_host_link: str | None = None
    qualys_vm_host_integration: str | None = None
    servicenow_host_id: str | None = None
    servicenow_host_uid: str | None = None
    servicenow_host_link: str | None = None
    servicenow_host_integration: str | None = None
    detail_source: str | None = None
    detail_fetched_at: datetime | None = None


class AssetEnrichment(BaseModel):
    asset_id: str
    status: str
    reason: str
    uid: str | None = None
    dnsname: str | None = None
    mac_addresses: str | None = None
    uuid: str | None = None
    tracking_method: str | None = None
    owner: str | None = None
    service_team: str | None = None
    division: str | None = None
    it_sme: str | None = None
    it_director: str | None = None
    location: str | None = None
    internal_or_external: str | None = None
    device_type: str | None = None
    category: str | None = None
    virtual_or_physical: str | None = None
    compliance_flags: str | None = None
    pci: bool | None = None
    pii: bool | None = None
    last_authenticated_scan: datetime | None = None
    last_scanned: datetime | None = None
    detail_source: str | None = None
    detail_fetched_at: datetime | None = None


class PaginatedAssets(BaseModel):
    items: list[AssetSummary]
    total: int
    page: int
    page_size: int


class AssetScoreDistribution(BaseModel):
    low: int = 0
    medium: int = 0
    high: int = 0
    critical: int = 0
    unscored: int = 0


class AssetAnalyticsResponse(BaseModel):
    total_assets: int = 0
    asset_criticality_distribution: AssetScoreDistribution
    finding_risk_distribution: AssetScoreDistribution


class AssetTypeDistributionItem(BaseModel):
    label: str
    count: int


class BusinessServiceAnalyticsTotals(BaseModel):
    applications: int = 0
    assets: int = 0
    findings: int = 0


class BusinessServiceAnalytics(BaseModel):
    service_risk_score: float | None = None
    service_risk_label: str | None = None
    business_criticality_score: int | None = None
    business_criticality_max: int = 5
    business_criticality_label: str | None = None
    totals: BusinessServiceAnalyticsTotals
    asset_criticality_distribution: AssetScoreDistribution
    asset_type_distribution: list[AssetTypeDistributionItem]


class AssetFindingsPage(BaseModel):
    asset: AssetSummary
    items: list[FindingSummary]
    total: int
    page: int
    page_size: int


class AssetFindingsAnalytics(BaseModel):
    total_findings: int
    kev_findings: int
    critical_high_findings: int
    highest_risk_band: str | None = None
    average_risk_score: float | None = None
    max_risk_score: float | None = None
    oldest_priority_age_days: float | None = None
    risk_bands: RiskBandSummary


class AssetFindingsAnalyticsAsset(BaseModel):
    asset_id: str
    hostname: str | None = None
    business_unit: str | None = None
    business_service: str | None = None
    application: str | None = None
    status: str | None = None
    environment: str | None = None
    internal_or_external: str | None = None
    device_type: str | None = None
    category: str | None = None


class AssetFindingsAnalyticsResponse(BaseModel):
    asset: AssetFindingsAnalyticsAsset
    analytics: AssetFindingsAnalytics


class FindingEnrichment(BaseModel):
    finding_id: str
    summary: str | None = None
    description: str | None = None
    record_link: str | None = None
    source_status: str | None = None
    severity: str | None = None
    due_date: datetime | None = None
    attack_pattern_names: str | None = None
    attack_technique_names: str | None = None
    attack_tactic_names: str | None = None
    risk_owner_name: str | None = None
    remediation_owner_name: str | None = None
    remediation_status: str | None = None
    detail_source: str | None = None
    detail_fetched_at: datetime | None = None


class BusinessUnitDetail(BaseModel):
    company: CompanySummary | None = None
    business_unit: str
    slug: str
    uid: str | None = None
    uuid: str | None = None
    description: str | None = None
    owner: str | None = None
    data_integration: str | None = None
    connector: str | None = None
    connector_category: str | None = None
    data_model: str | None = None
    last_integration_transaction_id: str | None = None
    flow_state: str | None = None
    created_by: str | None = None
    updated_by: str | None = None
    source_last_modified_at: datetime | None = None
    source_last_integrated_at: datetime | None = None
    source_created_at: datetime | None = None
    source_updated_at: datetime | None = None
    metrics: TopologyMetrics
    business_services: list[BusinessServiceSummary]


class BusinessServiceDetail(BaseModel):
    company: CompanySummary | None = None
    business_unit: str
    business_service: str
    slug: str
    uid: str | None = None
    uuid: str | None = None
    description: str | None = None
    criticality_label: str | None = None
    division: str | None = None
    manager: str | None = None
    data_integration: str | None = None
    connector: str | None = None
    connector_category: str | None = None
    data_model: str | None = None
    last_integration_transaction_id: str | None = None
    flow_state: str | None = None
    created_by: str | None = None
    updated_by: str | None = None
    source_last_modified_at: datetime | None = None
    source_last_integrated_at: datetime | None = None
    source_created_at: datetime | None = None
    source_updated_at: datetime | None = None
    metrics: TopologyMetrics
    applications: list[ApplicationSummary]
    direct_assets: list[AssetSummary]


class ApplicationDetail(BaseModel):
    company: CompanySummary | None = None
    business_unit: str
    business_service: str
    application: str
    slug: str
    first_seen_at: datetime | None = None
    metrics: TopologyMetrics
    assets: list[AssetSummary]


class SourceSummary(BaseModel):
    source: str
    total_findings: int
    risk_bands: RiskBandSummary
