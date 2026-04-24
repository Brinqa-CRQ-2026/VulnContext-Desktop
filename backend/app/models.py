"""Runtime ORM models for the Supabase-first backend slice."""

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.core.db import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    business_units = relationship("BusinessUnit", back_populates="company")
    assets = relationship("Asset", back_populates="company")


class BusinessUnit(Base):
    __tablename__ = "business_units"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    uid = Column(String, nullable=True)
    uuid = Column(String, nullable=True)
    name = Column(String, nullable=False, index=True)
    slug = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    owner = Column(String, nullable=True)
    data_integration = Column(String, nullable=True)
    connector = Column(String, nullable=True)
    connector_category = Column(String, nullable=True)
    data_model = Column(String, nullable=True)
    last_integration_transaction_id = Column(String, nullable=True)
    flow_state = Column(String, nullable=True)
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    source_last_modified_at = Column(DateTime(timezone=True), nullable=True)
    source_last_integrated_at = Column(DateTime(timezone=True), nullable=True)
    source_created_at = Column(DateTime(timezone=True), nullable=True)
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    company = relationship("Company", back_populates="business_units")
    business_services = relationship("BusinessService", back_populates="business_unit")
    assets = relationship("Asset", back_populates="business_unit")


class BusinessService(Base):
    __tablename__ = "business_services"
    __table_args__ = (
        UniqueConstraint("business_unit_id", "slug", name="uq_business_services_business_unit_slug"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_unit_id = Column(
        String,
        ForeignKey("business_units.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uid = Column(String, nullable=True)
    uuid = Column(String, nullable=True)
    name = Column(String, nullable=False, index=True)
    slug = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    criticality_label = Column(String, nullable=True)
    division = Column(String, nullable=True)
    manager = Column(String, nullable=True)
    data_integration = Column(String, nullable=True)
    connector = Column(String, nullable=True)
    connector_category = Column(String, nullable=True)
    data_model = Column(String, nullable=True)
    last_integration_transaction_id = Column(String, nullable=True)
    flow_state = Column(String, nullable=True)
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    source_last_modified_at = Column(DateTime(timezone=True), nullable=True)
    source_last_integrated_at = Column(DateTime(timezone=True), nullable=True)
    source_created_at = Column(DateTime(timezone=True), nullable=True)
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    business_unit = relationship("BusinessUnit", back_populates="business_services")
    applications = relationship("Application", back_populates="business_service")
    assets = relationship("Asset", back_populates="business_service_rel")


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("business_service_id", "slug", name="uq_applications_business_service_slug"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_service_id = Column(
        String,
        ForeignKey("business_services.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String, nullable=False, index=True)
    slug = Column(String, nullable=False, index=True)
    first_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    business_service = relationship("BusinessService", back_populates="applications")
    assets = relationship("Asset", back_populates="application_rel")


class Asset(Base):
    __tablename__ = "assets"

    asset_id = Column(String, primary_key=True, index=True)
    hostname = Column(String, nullable=True, index=True)
    application = Column(String, nullable=True)
    business_service = Column(String, nullable=True, index=True)
    internal_or_external = Column(String, nullable=True, index=True)
    category = Column(String, nullable=True)
    status = Column(String, nullable=True, index=True)
    compliance_status = Column(String, nullable=True, index=True)
    pci = Column(Boolean, nullable=True)
    pii = Column(Boolean, nullable=True)
    asset_criticality = Column(Integer, nullable=True, index=True)
    qualys_vm_host_id = Column(String, nullable=True, index=True)
    servicenow_host_id = Column(String, nullable=True, index=True)
    company_id = Column(String, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    business_unit_id = Column(
        String,
        ForeignKey("business_units.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    business_service_id = Column(
        String,
        ForeignKey("business_services.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    application_id = Column(
        String,
        ForeignKey("applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    exposure_score = Column(Float, nullable=True)
    business_criticality_score = Column(Float, nullable=True)
    data_sensitivity_score = Column(Float, nullable=True)
    asset_type_weight = Column(Float, nullable=True)
    is_public_facing = Column(Boolean, nullable=True)
    has_sensitive_data = Column(Boolean, nullable=True)
    crown_jewel_flag = Column(Boolean, nullable=True)
    internet_exposed_flag = Column(Boolean, nullable=True)

    findings = relationship("Finding", back_populates="asset")
    company = relationship("Company", back_populates="assets")
    business_unit = relationship("BusinessUnit", back_populates="assets")
    business_service_rel = relationship("BusinessService", back_populates="assets")
    application_rel = relationship("Application", back_populates="assets")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String, ForeignKey("assets.asset_id"), nullable=False, index=True)
    finding_id = Column(String, nullable=False, index=True)
    finding_uid = Column(String, nullable=True, index=True)
    finding_name = Column(String, nullable=True)
    status = Column(String, nullable=True, index=True)
    cve_id = Column(String, nullable=True, index=True)
    brinqa_base_risk_score = Column(Float, nullable=True)
    brinqa_risk_score = Column(Float, nullable=True, index=True)
    first_found = Column(DateTime, nullable=True)
    last_found = Column(DateTime, nullable=True)
    age_in_days = Column(Float, nullable=True, index=True)
    date_created = Column(DateTime, nullable=True)
    last_updated = Column(DateTime, nullable=True)
    crq_score = Column(Float, nullable=True, index=True)
    crq_risk_band = Column(String, nullable=True, index=True)
    crq_scored_at = Column(DateTime(timezone=True), nullable=True)
    crq_score_version = Column(String, nullable=True)
    crq_cvss_score = Column(Float, nullable=True)
    crq_epss_score = Column(Float, nullable=True)
    crq_epss_percentile = Column(Float, nullable=True)
    crq_epss_multiplier = Column(Float, nullable=True)
    crq_is_kev = Column(Boolean, nullable=True)
    crq_kev_bonus = Column(Float, nullable=True)
    crq_age_days = Column(Float, nullable=True)
    crq_age_bonus = Column(Float, nullable=True)
    crq_notes = Column(Text, nullable=True)

    asset = relationship("Asset", back_populates="findings")


class EPSSScore(Base):
    __tablename__ = "epss_scores"

    cve = Column(String, primary_key=True)
    epss = Column(Float, nullable=True)
    percentile = Column(Float, nullable=True)
    date = Column(String, nullable=True)
    is_kev = Column(Boolean, nullable=True)
    date_fetched = Column(DateTime(timezone=True), nullable=True)


class KevRecord(Base):
    __tablename__ = "kev"

    cve = Column(String, primary_key=True)
    date_added = Column(String, nullable=True)
    due_date = Column(String, nullable=True)
    vendor_project = Column(String, nullable=True)
    product = Column(String, nullable=True)
    vulnerability_name = Column(String, nullable=True)
    short_description = Column(Text, nullable=True)


class NvdRecord(Base):
    __tablename__ = "nvd"

    cve = Column(String, primary_key=True)
    cvss_score = Column(Float, nullable=True)
    cvss_severity = Column(String, nullable=True)
