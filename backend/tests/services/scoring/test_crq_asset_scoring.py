import math
from datetime import datetime, timezone

import pytest

from app import models
from app.services.scoring.crq_asset import (
    calculate_aggregated_finding_risk,
    calculate_asset_context_score,
    calculate_asset_risk_score,
    calculate_asset_type_score,
    calculate_data_sensitivity_score,
    calculate_environment_score,
    calculate_exposure_score,
    calculate_severity_burden_score,
    calculate_weighted_severity_average,
    derive_environment,
    score_assets,
)


def seed_asset_with_findings(
    db_session,
    *,
    asset_id: str,
    tags: list[str] | None = None,
    environment: str | None = None,
    internal_or_external: str | None = None,
    public_ip_addresses: str | None = None,
    pci: bool | None = None,
    pii: bool | None = None,
    compliance_flags: str | None = None,
    device_type: str | None = None,
    category: str | None = None,
    crq_scores: list[float | None] | None = None,
):
    asset = models.Asset(
        asset_id=asset_id,
        hostname=f"{asset_id}-host",
        tags=tags,
        environment=environment,
        internal_or_external=internal_or_external,
        public_ip_addresses=public_ip_addresses,
        pci=pci,
        pii=pii,
        compliance_flags=compliance_flags,
        device_type=device_type,
        category=category,
    )
    db_session.add(asset)
    db_session.flush()

    for idx, score in enumerate(crq_scores or [], start=1):
        db_session.add(
            models.Finding(
                asset_id=asset_id,
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


def test_aggregated_finding_risk_handles_empty_and_stays_bounded():
    assert calculate_aggregated_finding_risk([]) == 0.0
    assert calculate_aggregated_finding_risk(None) == 0.0
    assert calculate_aggregated_finding_risk([12.0, -4.0, 3.0]) <= 10.0
    assert calculate_aggregated_finding_risk([12.0, -4.0, 3.0]) >= 0.0
    assert calculate_aggregated_finding_risk([10.0, 10.0, 10.0]) <= 10.0


def test_aggregated_finding_risk_prioritizes_high_scores_without_low_score_inflation():
    one_critical = calculate_aggregated_finding_risk([9.8])
    many_low = calculate_aggregated_finding_risk([1.0] * 20)
    high_cluster = calculate_aggregated_finding_risk([9.6, 9.1, 8.7, 8.2, 7.9, 1.0, 1.0])
    same_peak_more_highs = calculate_aggregated_finding_risk([9.8, 8.9, 8.4, 7.8, 7.2])
    same_peak_more_lows = calculate_aggregated_finding_risk([9.8, 1.0, 1.0, 1.0, 1.0])

    assert one_critical > many_low
    assert high_cluster > many_low
    assert same_peak_more_highs > same_peak_more_lows


def test_aggregated_finding_risk_uses_weighted_severity_and_burden():
    scores = [9.5, 8.5, 7.5, 6.5, 5.5, 1.0]
    expected_weighted_severity_average = (
        (9.5 * 4.0)
        + (8.5 * 2.0)
        + (7.5 * 2.0)
        + (6.5 * 2.0)
        + (5.5 * 1.0)
        + (1.0 * 0.5)
    ) / (4.0 + 2.0 + 2.0 + 2.0 + 1.0 + 0.5)
    expected_severity_burden_score = (
        math.log(1 + ((1 * 10.0) + (3 * 5.0) + (1 * 2.0) + (1 * 0.5)))
        / math.log(1 + (len(scores) * 10))
    ) * 10
    expected = round(
        min(
            10.0,
            max(
                0.0,
                (0.25 * 9.5)
                + (0.50 * expected_weighted_severity_average)
                + (0.25 * expected_severity_burden_score),
            ),
        ),
        2,
    )

    assert calculate_weighted_severity_average(scores) == pytest.approx(
        expected_weighted_severity_average
    )
    assert calculate_severity_burden_score(scores) == pytest.approx(
        expected_severity_burden_score
    )
    assert calculate_aggregated_finding_risk(scores) == pytest.approx(expected)


def test_derive_environment_and_component_scores_handle_null_and_tag_variants():
    assert derive_environment(None) == "unknown"
    assert derive_environment(["Production"]) == "production"
    assert derive_environment(["Test"]) == "test"
    assert derive_environment(["Development"]) == "development"

    assert calculate_exposure_score("External", None) == 1.0
    assert calculate_exposure_score("Internal", None) == 0.5
    assert calculate_exposure_score(None, None) == 0.4
    assert calculate_exposure_score(None, "1.2.3.4") == 1.0
    assert calculate_exposure_score(None, None) < calculate_exposure_score("Internal", None)

    assert calculate_data_sensitivity_score(True, True, None) == 1.0
    assert calculate_data_sensitivity_score(True, False, None) == 0.8
    assert calculate_data_sensitivity_score(None, None, None) == 0.4
    assert calculate_data_sensitivity_score(None, None, "SOX") == 0.4
    assert calculate_data_sensitivity_score(False, False, None) == 0.2
    assert calculate_data_sensitivity_score(False, False, "SOX") == 0.2

    assert calculate_environment_score("production") == 1.0
    assert calculate_environment_score("prod") == 1.0
    assert calculate_environment_score("test") == 0.6
    assert calculate_environment_score("staging") == 0.6
    assert calculate_environment_score("qa") == 0.6
    assert calculate_environment_score("development") == 0.3
    assert calculate_environment_score("dev") == 0.3
    assert calculate_environment_score("unknown") == 0.5
    assert calculate_environment_score("unknown") < calculate_environment_score("production")

    assert calculate_asset_type_score("Firewall", None) == 1.0
    assert calculate_asset_type_score("Router", None) == 0.95
    assert calculate_asset_type_score("Network", None) == 0.95
    assert calculate_asset_type_score("Hypervisor", None) == 0.9
    assert calculate_asset_type_score("Server", None) == 0.8
    assert calculate_asset_type_score("Cloud server", None) == 0.8
    assert calculate_asset_type_score("Workstation", None) == 0.4
    assert calculate_asset_type_score("Printer", None) == 0.3
    assert calculate_asset_type_score("Unknown", None) == 0.5
    assert calculate_asset_type_score(None, "Host") == 0.5
    assert calculate_asset_type_score(None, None) == 0.5


def test_asset_context_score_uses_weighted_model_and_bounds():
    result = calculate_asset_context_score(
        internal_or_external="External",
        public_ip_addresses=None,
        pci=True,
        pii=False,
        compliance_flags="SOX",
        environment="production",
        device_type="Firewall",
        category="infrastructure",
    )

    assert result["environment"] == "production"
    assert result["crq_asset_exposure_score"] == 1.0
    assert result["crq_asset_data_sensitivity_score"] == 0.8
    assert result["crq_asset_environment_score"] == 1.0
    assert result["crq_asset_type_score"] == 1.0
    assert result["crq_asset_context_score"] == pytest.approx(9.4)
    assert 0.0 <= result["crq_asset_exposure_score"] <= 1.0
    assert 0.0 <= result["crq_asset_data_sensitivity_score"] <= 1.0
    assert 0.0 <= result["crq_asset_environment_score"] <= 1.0
    assert 0.0 <= result["crq_asset_type_score"] <= 1.0
    assert 0.0 <= result["crq_asset_context_score"] <= 10.0


def test_asset_risk_score_uses_context_as_bounded_multiplier():
    high_context = calculate_asset_risk_score(8.0, 9.0)
    lower_context = calculate_asset_risk_score(8.0, 4.0)

    assert high_context == pytest.approx(7.76)
    assert lower_context == pytest.approx(6.56)
    assert high_context > lower_context
    assert high_context <= 8.0
    assert calculate_asset_risk_score(0.0, 10.0) == 0.0


def test_score_assets_persists_scores_and_supports_targeting(db_session):
    seed_asset_with_findings(
        db_session,
        asset_id="asset-a",
        tags=["prod"],
        environment="production",
        internal_or_external="External",
        public_ip_addresses="1.2.3.4",
        pci=True,
        pii=True,
        device_type="Network",
        crq_scores=[9.4, 7.6, 2.5],
    )
    seed_asset_with_findings(
        db_session,
        asset_id="asset-b",
        tags=None,
        environment="unknown",
        internal_or_external=None,
        public_ip_addresses=None,
        pci=False,
        pii=False,
        compliance_flags=None,
        device_type=None,
        category=None,
        crq_scores=[],
    )

    updated = score_assets(
        db_session,
        asset_ids=["asset-a"],
        scored_at=datetime(2024, 2, 1, tzinfo=timezone.utc),
    )
    assert updated == 1

    asset_a = db_session.get(models.Asset, "asset-a")
    asset_b = db_session.get(models.Asset, "asset-b")

    assert asset_a.crq_asset_aggregated_finding_risk == pytest.approx(8.55)
    assert 0.0 <= asset_a.crq_asset_aggregated_finding_risk <= 10.0
    assert asset_a.crq_asset_exposure_score == 1.0
    assert asset_a.crq_asset_data_sensitivity_score == 1.0
    assert asset_a.environment == "production"
    assert asset_a.crq_asset_environment_score == 1.0
    assert asset_a.crq_asset_type_score == 0.95
    assert asset_a.crq_asset_context_score == pytest.approx(9.92)
    assert asset_a.crq_asset_risk_score == pytest.approx(8.53)
    assert 0.0 <= asset_a.crq_asset_context_score <= 10.0
    assert 0.0 <= asset_a.crq_asset_risk_score <= 10.0
    assert asset_a.crq_asset_risk_score <= asset_a.crq_asset_aggregated_finding_risk
    assert asset_a.crq_asset_scored_at == datetime(2024, 2, 1, tzinfo=timezone.utc)

    assert asset_b.crq_asset_aggregated_finding_risk is None
    assert asset_b.crq_asset_context_score is None


def test_score_assets_assigns_zero_aggregated_risk_when_no_crq_findings_exist(db_session):
    seed_asset_with_findings(
        db_session,
        asset_id="asset-empty",
        tags=["testing"],
        environment="test",
        internal_or_external="Internal",
        compliance_flags="HIPAA",
        device_type="Server",
        crq_scores=[None, None],
    )

    updated = score_assets(db_session, asset_ids=["asset-empty"])
    assert updated == 1

    asset = db_session.get(models.Asset, "asset-empty")
    assert asset.crq_asset_aggregated_finding_risk == 0.0
    assert asset.crq_asset_exposure_score == 0.5
    assert asset.crq_asset_data_sensitivity_score == 0.4
    assert asset.environment == "test"
    assert asset.crq_asset_environment_score == 0.6
    assert asset.crq_asset_type_score == 0.8
    assert asset.crq_asset_context_score == pytest.approx(5.35)
    assert asset.crq_asset_risk_score == 0.0


def test_final_asset_risk_changes_with_context_for_same_finding_pressure(db_session):
    seed_asset_with_findings(
        db_session,
        asset_id="asset-high-context",
        environment="production",
        internal_or_external="External",
        public_ip_addresses="1.2.3.4",
        pci=True,
        pii=True,
        device_type="Firewall",
        category="Host",
        crq_scores=[8.0],
    )
    seed_asset_with_findings(
        db_session,
        asset_id="asset-low-context",
        environment="development",
        internal_or_external=None,
        public_ip_addresses=None,
        pci=False,
        pii=False,
        device_type="Printer",
        category="Host",
        crq_scores=[8.0],
    )

    score_assets(db_session, asset_ids=["asset-high-context", "asset-low-context"])

    high_context_asset = db_session.get(models.Asset, "asset-high-context")
    low_context_asset = db_session.get(models.Asset, "asset-low-context")

    assert high_context_asset.crq_asset_context_score == pytest.approx(10.0)
    assert low_context_asset.crq_asset_context_score == pytest.approx(3.05)
    assert high_context_asset.crq_asset_aggregated_finding_risk == pytest.approx(
        low_context_asset.crq_asset_aggregated_finding_risk
    )
    assert high_context_asset.crq_asset_risk_score > low_context_asset.crq_asset_risk_score
    assert high_context_asset.crq_asset_risk_score <= high_context_asset.crq_asset_aggregated_finding_risk
    assert low_context_asset.crq_asset_risk_score <= low_context_asset.crq_asset_aggregated_finding_risk
