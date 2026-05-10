import math
from datetime import datetime, timezone

import pytest

from app import models
from app.services.crq_business_service_scoring import (
    calculate_aggregated_application_risk,
    calculate_aggregated_direct_asset_risk,
    calculate_business_service_priority_score,
    calculate_business_service_risk_score,
    parse_business_criticality_score,
    score_business_unit_rollups,
    score_business_services,
    score_business_services_and_business_units,
)


def seed_business_unit(db_session, *, unit_id: str = "unit-1"):
    company = models.Company(id=f"{unit_id}-company", name=f"{unit_id} Company")
    business_unit = models.BusinessUnit(
        id=unit_id,
        company=company,
        name=f"{unit_id} Unit",
        slug=f"{unit_id}-unit",
    )
    db_session.add(business_unit)
    db_session.commit()
    return business_unit


def seed_business_service(
    db_session,
    *,
    service_id: str = "service-1",
    business_unit: models.BusinessUnit | None = None,
    criticality_label: str | None = None,
):
    if business_unit is None:
        business_unit = seed_business_unit(db_session, unit_id=f"{service_id}-unit")
    business_service = models.BusinessService(
        id=service_id,
        business_unit=business_unit,
        name=f"{service_id} Service",
        slug=f"{service_id}-service",
        criticality_label=criticality_label,
    )
    db_session.add(business_service)
    db_session.commit()
    return business_service


def seed_application(
    db_session,
    *,
    business_service: models.BusinessService,
    application_id: str,
    crq_application_risk_score: float | None,
    asset_count: int | None = 1,
    finding_count: int | None = 1,
):
    application = models.Application(
        id=application_id,
        business_service_id=business_service.id,
        name=f"{application_id} Application",
        slug=f"{application_id}-application",
        crq_application_risk_score=crq_application_risk_score,
        crq_application_asset_count=asset_count,
        crq_application_finding_count=finding_count,
    )
    db_session.add(application)
    db_session.commit()
    return application


def seed_asset(
    db_session,
    *,
    asset_id: str,
    business_service: models.BusinessService | None = None,
    application: models.Application | None = None,
    crq_asset_risk_score: float | None = None,
    finding_count: int = 0,
):
    asset = models.Asset(
        asset_id=asset_id,
        hostname=f"{asset_id}-host",
        business_service_id=business_service.id if business_service else None,
        business_unit_id=business_service.business_unit_id if business_service else None,
        company_id=business_service.business_unit.company_id if business_service else None,
        application_id=application.id if application else None,
        crq_asset_risk_score=crq_asset_risk_score,
    )
    db_session.add(asset)
    db_session.flush()

    for idx in range(1, finding_count + 1):
        db_session.add(
            models.Finding(
                asset_id=asset.asset_id,
                finding_id=f"{asset_id}-finding-{idx}",
                finding_uid=f"{asset_id}-uid-{idx}",
                finding_name=f"Finding {idx}",
                status="Confirmed active",
                brinqa_risk_score=5.0,
                crq_finding_score=5.0,
                last_updated=datetime(2024, 1, 20, tzinfo=timezone.utc),
            )
        )

    db_session.commit()
    return asset


def expected_weighted_application_average(
    scores: list[float | None],
    asset_counts: list[int | None],
    finding_counts: list[int | None],
) -> float:
    weighted_total = 0.0
    weight_total = 0.0
    for score, asset_count, finding_count in zip(scores, asset_counts, finding_counts):
        if score is None:
            continue
        weight = math.log(1 + (asset_count or 0)) + math.log(1 + (finding_count or 0))
        weighted_total += score * weight
        weight_total += weight
    if weight_total <= 0:
        return 0.0
    return round(weighted_total / weight_total, 2)


def expected_weighted_direct_asset_average(
    scores: list[float | None],
    finding_counts: list[int | None],
) -> float:
    weighted_total = 0.0
    weight_total = 0.0
    for score, finding_count in zip(scores, finding_counts):
        if score is None:
            continue
        weight = math.log(1 + (finding_count or 0))
        weighted_total += score * weight
        weight_total += weight
    if weight_total <= 0:
        return 0.0
    return round(weighted_total / weight_total, 2)


def test_parse_business_criticality_score_handles_supported_labels():
    assert parse_business_criticality_score("2-low") == 2
    assert parse_business_criticality_score("5: critical") == 5
    assert parse_business_criticality_score(" 0 - none ") == 0
    assert parse_business_criticality_score(None) is None
    assert parse_business_criticality_score("critical") is None
    assert parse_business_criticality_score("6-critical") is None


def test_business_service_priority_score_uses_weighted_average_and_fallback():
    assert calculate_business_service_priority_score(8.0, 5) == pytest.approx(8.6)
    assert calculate_business_service_priority_score(8.0, None) == pytest.approx(8.0)
    assert calculate_business_service_priority_score(12.0, 5) == pytest.approx(10.0)
    assert calculate_business_service_priority_score(-2.0, 0) == pytest.approx(0.0)


def test_no_applications_and_no_assets_gives_zero_risk(db_session):
    business_service = seed_business_service(db_session, service_id="service-empty")

    updated = score_business_services(
        db_session,
        business_service_ids=[business_service.id],
    )

    refreshed = db_session.get(models.BusinessService, business_service.id)
    assert updated == 1
    assert refreshed.crq_business_service_aggregated_application_risk == 0.0
    assert refreshed.crq_business_service_aggregated_direct_asset_risk == 0.0
    assert refreshed.crq_business_service_risk_score == 0.0
    assert refreshed.crq_business_service_priority_score == 0.0
    assert refreshed.crq_business_service_application_count == 0
    assert refreshed.crq_business_service_asset_count == 0
    assert refreshed.crq_business_service_finding_count == 0


def test_aggregated_application_risk_rolls_up_correctly(db_session):
    business_service = seed_business_service(
        db_session,
        service_id="service-app-rollup",
        criticality_label="5-critical",
    )
    scores = [9.5, 8.5, 7.5, 6.5, 5.5, 1.0]
    asset_counts = [9, 4, 3, 2, 1, 0]
    finding_counts = [20, 12, 8, 4, 1, 0]
    for idx, score in enumerate(scores, start=1):
        seed_application(
            db_session,
            business_service=business_service,
            application_id=f"app-rollup-{idx}",
            crq_application_risk_score=score,
            asset_count=asset_counts[idx - 1],
            finding_count=finding_counts[idx - 1],
        )

    score_business_services(db_session, business_service_ids=[business_service.id])

    refreshed = db_session.get(models.BusinessService, business_service.id)
    assert calculate_aggregated_application_risk(scores, asset_counts, finding_counts) == pytest.approx(
        expected_weighted_application_average(scores, asset_counts, finding_counts)
    )
    assert refreshed.crq_business_service_aggregated_application_risk == pytest.approx(
        expected_weighted_application_average(scores, asset_counts, finding_counts)
    )
    assert refreshed.crq_business_service_risk_score == pytest.approx(
        refreshed.crq_business_service_aggregated_application_risk
    )
    assert refreshed.business_criticality_score == 5
    assert refreshed.crq_business_service_priority_score == pytest.approx(
        calculate_business_service_priority_score(
            refreshed.crq_business_service_risk_score,
            5,
        )
    )


def test_aggregated_direct_asset_risk_rolls_up_correctly(db_session):
    business_service = seed_business_service(db_session, service_id="service-direct-rollup")
    scores = [8.8, 7.7, 6.6, 5.5, 4.4, 0.5]
    finding_counts = [20, 12, 8, 4, 1, 0]
    for idx, score in enumerate(scores, start=1):
        seed_asset(
            db_session,
            business_service=business_service,
            asset_id=f"direct-rollup-{idx}",
            crq_asset_risk_score=score,
            finding_count=finding_counts[idx - 1],
        )

    score_business_services(db_session, business_service_ids=[business_service.id])

    refreshed = db_session.get(models.BusinessService, business_service.id)
    assert calculate_aggregated_direct_asset_risk(scores, finding_counts) == pytest.approx(
        expected_weighted_direct_asset_average(scores, finding_counts)
    )
    assert refreshed.crq_business_service_aggregated_direct_asset_risk == pytest.approx(
        expected_weighted_direct_asset_average(scores, finding_counts)
    )
    assert refreshed.crq_business_service_risk_score == pytest.approx(
        refreshed.crq_business_service_aggregated_direct_asset_risk
    )


def test_null_application_risk_scores_are_ignored(db_session):
    business_service = seed_business_service(db_session, service_id="service-null-apps")
    seed_application(
        db_session,
        business_service=business_service,
        application_id="app-scored",
        crq_application_risk_score=8.0,
    )
    seed_application(
        db_session,
        business_service=business_service,
        application_id="app-null",
        crq_application_risk_score=None,
    )

    score_business_services(db_session, business_service_ids=[business_service.id])

    refreshed = db_session.get(models.BusinessService, business_service.id)
    assert refreshed.crq_business_service_aggregated_application_risk == pytest.approx(
        calculate_aggregated_application_risk([8.0], [1], [1])
    )
    assert refreshed.crq_business_service_application_count == 2


def test_null_asset_risk_scores_are_ignored(db_session):
    business_service = seed_business_service(db_session, service_id="service-null-assets")
    seed_asset(
        db_session,
        business_service=business_service,
        asset_id="direct-scored",
        crq_asset_risk_score=7.5,
        finding_count=2,
    )
    seed_asset(
        db_session,
        business_service=business_service,
        asset_id="direct-null",
        crq_asset_risk_score=None,
    )

    score_business_services(db_session, business_service_ids=[business_service.id])

    refreshed = db_session.get(models.BusinessService, business_service.id)
    assert refreshed.crq_business_service_aggregated_direct_asset_risk == pytest.approx(
        calculate_aggregated_direct_asset_risk([7.5], [2])
    )
    assert refreshed.crq_business_service_asset_count == 2


def test_final_business_service_risk_combines_application_and_direct_asset_risk(db_session):
    business_service = seed_business_service(db_session, service_id="service-combined")
    seed_application(
        db_session,
        business_service=business_service,
        application_id="combined-app",
        crq_application_risk_score=8.0,
    )
    seed_asset(
        db_session,
        business_service=business_service,
        asset_id="combined-direct",
        crq_asset_risk_score=6.0,
        finding_count=2,
    )

    score_business_services(db_session, business_service_ids=[business_service.id])

    refreshed = db_session.get(models.BusinessService, business_service.id)
    expected = calculate_business_service_risk_score(
        refreshed.crq_business_service_aggregated_application_risk,
        refreshed.crq_business_service_aggregated_direct_asset_risk,
        scored_application_count=1,
        scored_direct_asset_count=1,
    )
    assert refreshed.crq_business_service_risk_score == pytest.approx(expected)
    assert refreshed.crq_business_service_risk_score == pytest.approx(
        round(
            (0.80 * refreshed.crq_business_service_aggregated_application_risk)
            + (0.20 * refreshed.crq_business_service_aggregated_direct_asset_risk),
            2,
        )
    )


def test_only_application_risk_exists_uses_application_risk_directly(db_session):
    business_service = seed_business_service(db_session, service_id="service-app-only")
    seed_application(
        db_session,
        business_service=business_service,
        application_id="app-only",
        crq_application_risk_score=8.2,
    )

    score_business_services(db_session, business_service_ids=[business_service.id])

    refreshed = db_session.get(models.BusinessService, business_service.id)
    assert refreshed.crq_business_service_risk_score == pytest.approx(
        refreshed.crq_business_service_aggregated_application_risk
    )


def test_only_direct_asset_risk_exists_uses_direct_asset_risk_directly(db_session):
    business_service = seed_business_service(db_session, service_id="service-direct-only")
    seed_asset(
        db_session,
        business_service=business_service,
        asset_id="direct-only",
        crq_asset_risk_score=7.3,
        finding_count=2,
    )

    score_business_services(db_session, business_service_ids=[business_service.id])

    refreshed = db_session.get(models.BusinessService, business_service.id)
    assert refreshed.crq_business_service_risk_score == pytest.approx(
        refreshed.crq_business_service_aggregated_direct_asset_risk
    )


def test_zero_application_risk_with_direct_asset_risk_uses_combined_formula(db_session):
    business_service = seed_business_service(db_session, service_id="service-zero-app")
    seed_application(
        db_session,
        business_service=business_service,
        application_id="zero-risk-app",
        crq_application_risk_score=0.0,
    )
    seed_asset(
        db_session,
        business_service=business_service,
        asset_id="direct-with-risk",
        crq_asset_risk_score=8.0,
        finding_count=2,
    )

    score_business_services(db_session, business_service_ids=[business_service.id])

    refreshed = db_session.get(models.BusinessService, business_service.id)
    assert refreshed.crq_business_service_aggregated_application_risk == 0.0
    assert refreshed.crq_business_service_risk_score == pytest.approx(
        round(0.20 * refreshed.crq_business_service_aggregated_direct_asset_risk, 2)
    )


def test_asset_count_deduplicates_assets_correctly(db_session):
    business_service = seed_business_service(db_session, service_id="service-asset-dedupe")
    application = seed_application(
        db_session,
        business_service=business_service,
        application_id="dedupe-app",
        crq_application_risk_score=6.0,
    )
    seed_asset(
        db_session,
        business_service=business_service,
        application=application,
        asset_id="reachable-two-ways",
        crq_asset_risk_score=5.0,
    )
    seed_asset(
        db_session,
        business_service=business_service,
        asset_id="direct-only-dedupe",
        crq_asset_risk_score=4.0,
    )
    seed_asset(
        db_session,
        application=application,
        asset_id="app-only-dedupe",
        crq_asset_risk_score=3.0,
    )

    score_business_services(db_session, business_service_ids=[business_service.id])

    refreshed = db_session.get(models.BusinessService, business_service.id)
    assert refreshed.crq_business_service_asset_count == 3


def test_finding_count_uses_unique_assets(db_session):
    business_service = seed_business_service(db_session, service_id="service-finding-dedupe")
    application = seed_application(
        db_session,
        business_service=business_service,
        application_id="finding-app",
        crq_application_risk_score=6.0,
    )
    seed_asset(
        db_session,
        business_service=business_service,
        application=application,
        asset_id="finding-two-ways",
        crq_asset_risk_score=5.0,
        finding_count=2,
    )
    seed_asset(
        db_session,
        application=application,
        asset_id="finding-app-only",
        crq_asset_risk_score=3.0,
        finding_count=3,
    )

    score_business_services(db_session, business_service_ids=[business_service.id])

    refreshed = db_session.get(models.BusinessService, business_service.id)
    assert refreshed.crq_business_service_finding_count == 5


def test_application_count_is_correct_and_targeting_is_supported(db_session):
    target = seed_business_service(db_session, service_id="service-target")
    untouched = seed_business_service(db_session, service_id="service-untouched")
    seed_application(
        db_session,
        business_service=target,
        application_id="target-app-a",
        crq_application_risk_score=7.0,
    )
    seed_application(
        db_session,
        business_service=target,
        application_id="target-app-b",
        crq_application_risk_score=None,
    )
    seed_application(
        db_session,
        business_service=untouched,
        application_id="untouched-app",
        crq_application_risk_score=9.0,
    )

    updated = score_business_services(db_session, business_service_ids=[target.id])

    refreshed_target = db_session.get(models.BusinessService, target.id)
    refreshed_untouched = db_session.get(models.BusinessService, untouched.id)
    assert updated == 1
    assert refreshed_target.crq_business_service_application_count == 2
    assert refreshed_target.crq_business_service_scored_at is not None
    assert refreshed_untouched.crq_business_service_risk_score is None


def test_malformed_criticality_label_persists_null_and_priority_falls_back_to_risk(db_session):
    business_service = seed_business_service(
        db_session,
        service_id="service-bad-criticality",
        criticality_label="critical",
    )
    seed_application(
        db_session,
        business_service=business_service,
        application_id="bad-criticality-app",
        crq_application_risk_score=7.4,
    )

    score_business_services(db_session, business_service_ids=[business_service.id])

    refreshed = db_session.get(models.BusinessService, business_service.id)
    assert refreshed.business_criticality_score is None
    assert refreshed.crq_business_service_priority_score == pytest.approx(
        refreshed.crq_business_service_risk_score
    )


def test_business_unit_rollup_averages_scored_services_and_ignores_nulls(db_session):
    business_unit = seed_business_unit(db_session, unit_id="rollup-unit")
    scored_a = seed_business_service(
        db_session,
        service_id="rollup-service-a",
        business_unit=business_unit,
    )
    scored_b = seed_business_service(
        db_session,
        service_id="rollup-service-b",
        business_unit=business_unit,
    )
    seed_business_service(
        db_session,
        service_id="rollup-service-null",
        business_unit=business_unit,
    )
    scored_a.crq_business_service_risk_score = 8.0
    scored_a.crq_business_service_priority_score = 8.6
    scored_b.crq_business_service_risk_score = 4.0
    scored_b.crq_business_service_priority_score = 5.2
    db_session.commit()

    updated = score_business_unit_rollups(db_session, business_unit_ids=[business_unit.id])

    refreshed = db_session.get(models.BusinessUnit, business_unit.id)
    assert updated == 1
    assert refreshed.crq_business_unit_risk_score == pytest.approx(6.0)
    assert refreshed.crq_business_unit_priority_score == pytest.approx(6.9)


def test_business_service_scoring_entrypoint_updates_affected_business_unit(db_session):
    business_unit = seed_business_unit(db_session, unit_id="entrypoint-unit")
    business_service = seed_business_service(
        db_session,
        service_id="entrypoint-service",
        business_unit=business_unit,
        criticality_label="4-high",
    )
    seed_application(
        db_session,
        business_service=business_service,
        application_id="entrypoint-app",
        crq_application_risk_score=8.0,
    )

    updated_services, updated_units = score_business_services_and_business_units(
        db_session,
        business_service_ids=[business_service.id],
    )

    refreshed_service = db_session.get(models.BusinessService, business_service.id)
    refreshed_unit = db_session.get(models.BusinessUnit, business_unit.id)
    assert updated_services == 1
    assert updated_units == 1
    assert refreshed_service.business_criticality_score == 4
    assert refreshed_service.crq_business_service_priority_score == pytest.approx(8.0)
    assert refreshed_unit.crq_business_unit_risk_score == pytest.approx(
        refreshed_service.crq_business_service_risk_score
    )
    assert refreshed_unit.crq_business_unit_priority_score == pytest.approx(
        refreshed_service.crq_business_service_priority_score
    )
