from datetime import datetime, timezone

from app import models


def seed_asset_and_finding(
    db_session,
    *,
    idx: int,
    risk: float,
    status: str = "Confirmed active",
    crq_finding_score: float | None = None,
    crq_finding_priority_score: float | None = None,
    crq_finding_risk_band: str | None = None,
    crq_finding_is_kev: bool | None = None,
):
    asset = models.Asset(
        asset_id=f"asset-{idx}",
        hostname=f"host-{idx}",
        business_service=f"Business Service {idx}",
        application=f"Application {idx}",
        environment="test",
    )
    finding = models.Finding(
        id=idx,
        asset_id=asset.asset_id,
        finding_id=f"200{idx}",
        finding_uid=f"uid-{idx}",
        finding_name=f"Finding {idx}",
        status=status,
        cve_id=f"CVE-2024-{idx:04d}",
        brinqa_base_risk_score=max(0.0, risk - 1),
        brinqa_risk_score=risk,
        first_found=datetime(2024, 1, 1, tzinfo=timezone.utc),
        last_found=datetime(2024, 1, 15, tzinfo=timezone.utc),
        age_in_days=14.0,
        date_created=datetime(2024, 1, 1, tzinfo=timezone.utc),
        last_updated=datetime(2024, 1, 20, tzinfo=timezone.utc),
        crq_finding_score=crq_finding_score,
        crq_finding_priority_score=crq_finding_priority_score,
        crq_finding_risk_band=crq_finding_risk_band,
        crq_finding_score_version="v4" if crq_finding_score is not None else None,
        crq_finding_scored_at=datetime(2024, 1, 21, tzinfo=timezone.utc) if crq_finding_score is not None else None,
        crq_finding_cvss_score=8.8 if crq_finding_score is not None else None,
        crq_finding_epss_score=0.42 if crq_finding_score is not None else None,
        crq_finding_epss_percentile=0.97 if crq_finding_score is not None else None,
        crq_finding_epss_multiplier=0.35 if crq_finding_score is not None else None,
        crq_finding_is_kev=crq_finding_is_kev,
        crq_finding_kev_bonus=0.9 if crq_finding_is_kev else 0.0 if crq_finding_score is not None else None,
        crq_finding_age_days=14.0 if crq_finding_score is not None else None,
        crq_finding_age_bonus=0.0 if crq_finding_score is not None else None,
    )
    db_session.add(asset)
    db_session.add(finding)
    db_session.commit()
    return asset, finding
