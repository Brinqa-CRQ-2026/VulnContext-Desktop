import math
from datetime import datetime, timezone

import pytest

from app import models
from app.services.crq_application_scoring import (
    calculate_aggregated_asset_risk,
    calculate_application_compliance_score,
    calculate_application_risk_score,
    score_applications,
)


def seed_application(db_session, *, application_id: str = "app-1", tags=None):
    company = models.Company(id=f"{application_id}-company", name=f"{application_id} Company")
    business_unit = models.BusinessUnit(
        id=f"{application_id}-unit",
        company=company,
        name=f"{application_id} Unit",
        slug=f"{application_id}-unit",
    )
    business_service = models.BusinessService(
        id=f"{application_id}-service",
        business_unit=business_unit,
        name=f"{application_id} Service",
        slug=f"{application_id}-service",
    )
    application = models.Application(
        id=application_id,
        business_service=business_service,
        name=f"{application_id} Application",
        slug=f"{application_id}-application",
        description=f"{application_id} description",
        tags=tags,
    )
    db_session.add(application)
    db_session.commit()
    return application


def seed_asset(
    db_session,
    *,
    application: models.Application,
    asset_id: str,
    crq_asset_risk_score: float | None,
    finding_scores: list[float | None] | None = None,
):
    asset = models.Asset(
        asset_id=asset_id,
        hostname=f"{asset_id}-host",
        application_id=application.id,
        business_service_id=application.business_service_id,
        business_unit_id=application.business_service.business_unit_id,
        company_id=application.business_service.business_unit.company_id,
        crq_asset_risk_score=crq_asset_risk_score,
    )
    db_session.add(asset)
    db_session.flush()

    for idx, score in enumerate(finding_scores or [], start=1):
        db_session.add(
            models.Finding(
                asset_id=asset.asset_id,
                finding_id=f"{asset_id}-finding-{idx}",
                finding_uid=f"{asset_id}-uid-{idx}",
                finding_name=f"Finding {idx}",
                status="Confirmed active",
                brinqa_risk_score=5.0,
                crq_finding_score=score,
                last_updated=datetime(2024, 1, 20, tzinfo=timezone.utc),
            )
        )

    db_session.commit()
    return asset


def test_aggregated_asset_risk_handles_empty_and_ignores_nulls():
    assert calculate_aggregated_asset_risk([]) == 0.0
    assert calculate_aggregated_asset_risk(None) == 0.0
    assert calculate_aggregated_asset_risk([None, None]) == 0.0
    assert calculate_aggregated_asset_risk([12.0, -1.0, 10.0]) <= 10.0
    assert calculate_aggregated_asset_risk([12.0, -1.0, 10.0]) >= 0.0
    assert calculate_aggregated_asset_risk([None, 8.0]) == pytest.approx(
        calculate_aggregated_asset_risk([8.0])
    )


def test_aggregated_asset_risk_uses_max_top_five_average_and_log_scaled_volume():
    scores = [9.5, 8.5, 7.5, 6.5, 5.5, 1.0]
    total_asset_risk = sum(scores)
    expected_log_component = (
        math.log(1 + total_asset_risk) / math.log(1 + len(scores) * 10)
    ) * 10
    expected = round(
        min(
            10.0,
            max(
                0.0,
                (0.50 * 9.5)
                + (0.30 * (sum(scores[:5]) / 5))
                + (0.20 * expected_log_component),
            ),
        ),
        2,
    )

    assert calculate_aggregated_asset_risk(scores) == pytest.approx(expected)


def test_application_compliance_score_uses_pci_and_pii_tags():
    assert calculate_application_compliance_score(["PCI", "PII"]) == 10.0
    assert calculate_application_compliance_score(["pci"]) == 8.0
    assert calculate_application_compliance_score(["PII"]) == 8.0
    assert calculate_application_compliance_score(None) == 4.0
    assert calculate_application_compliance_score([]) == 2.0
    assert calculate_application_compliance_score(["SOX"]) == 2.0
    assert calculate_application_compliance_score('["PCI", "PII"]') == 10.0
    assert 0.0 <= calculate_application_compliance_score(["PCI", "PII"]) <= 10.0


def test_application_risk_score_never_exceeds_aggregated_asset_risk():
    high_compliance = calculate_application_risk_score(8.0, 10.0)
    lower_compliance = calculate_application_risk_score(8.0, 2.0)

    assert high_compliance == pytest.approx(8.0)
    assert lower_compliance == pytest.approx(6.08)
    assert lower_compliance < high_compliance
    assert high_compliance <= 8.0
    assert calculate_application_risk_score(12.0, 10.0) == 10.0
    assert calculate_application_risk_score(0.0, 10.0) == 0.0


def test_score_applications_persists_scores_counts_and_timestamp(db_session):
    application = seed_application(db_session, application_id="app-risk", tags=["PCI", "PII"])
    seed_asset(
        db_session,
        application=application,
        asset_id="asset-a",
        crq_asset_risk_score=9.5,
        finding_scores=[9.1, 7.2],
    )
    seed_asset(
        db_session,
        application=application,
        asset_id="asset-b",
        crq_asset_risk_score=8.0,
        finding_scores=[5.5],
    )
    seed_asset(
        db_session,
        application=application,
        asset_id="asset-c",
        crq_asset_risk_score=None,
        finding_scores=[4.0],
    )

    updated = score_applications(
        db_session,
        application_ids=[application.id],
        scored_at=datetime(2024, 2, 1, tzinfo=timezone.utc),
    )
    assert updated == 1

    refreshed = db_session.get(models.Application, application.id)
    assert refreshed.crq_application_aggregated_asset_risk == pytest.approx(
        calculate_aggregated_asset_risk([9.5, 8.0])
    )
    assert 0.0 <= refreshed.crq_application_aggregated_asset_risk <= 10.0
    assert refreshed.crq_application_compliance_score == 10.0
    assert refreshed.crq_application_risk_score == pytest.approx(
        refreshed.crq_application_aggregated_asset_risk
    )
    assert 0.0 <= refreshed.crq_application_compliance_score <= 10.0
    assert 0.0 <= refreshed.crq_application_risk_score <= 10.0
    assert refreshed.crq_application_risk_score <= refreshed.crq_application_aggregated_asset_risk
    assert refreshed.crq_application_asset_count == 3
    assert refreshed.crq_application_finding_count == 4
    assert refreshed.crq_application_scored_at == datetime(2024, 2, 1, tzinfo=timezone.utc)


def test_score_applications_handles_no_supporting_assets(db_session):
    application = seed_application(db_session, application_id="app-empty", tags=[])

    score_applications(db_session, application_ids=[application.id])

    refreshed = db_session.get(models.Application, application.id)
    assert refreshed.crq_application_aggregated_asset_risk == 0.0
    assert refreshed.crq_application_risk_score == 0.0
    assert refreshed.crq_application_compliance_score == 2.0
    assert refreshed.crq_application_asset_count == 0
    assert refreshed.crq_application_finding_count == 0


def test_score_applications_supports_targeting(db_session):
    target = seed_application(db_session, application_id="app-target", tags=["PCI"])
    untouched = seed_application(db_session, application_id="app-untouched", tags=["PII"])
    seed_asset(
        db_session,
        application=target,
        asset_id="target-asset",
        crq_asset_risk_score=7.5,
    )
    seed_asset(
        db_session,
        application=untouched,
        asset_id="untouched-asset",
        crq_asset_risk_score=9.0,
    )

    updated = score_applications(db_session, application_ids=[target.id])
    assert updated == 1

    refreshed_target = db_session.get(models.Application, target.id)
    refreshed_untouched = db_session.get(models.Application, untouched.id)
    assert refreshed_target.crq_application_aggregated_asset_risk is not None
    assert refreshed_target.crq_application_compliance_score == 8.0
    assert refreshed_untouched.crq_application_aggregated_asset_risk is None
