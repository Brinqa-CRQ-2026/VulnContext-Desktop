import pytest

from app.services.crq_rollup_scoring import (
    calculate_aggregated_risk,
    calculate_aggregated_risk_from_parts,
    calculate_log_scaled_volume,
    calculate_top_percent_count,
)


def test_rollup_returns_zero_for_empty_or_unscored_inputs():
    assert calculate_aggregated_risk([]) == 0.0
    assert calculate_aggregated_risk(None) == 0.0
    assert calculate_aggregated_risk([None, None]) == 0.0
    assert calculate_log_scaled_volume(total_score=20.0, scored_count=0) == 0.0
    assert calculate_top_percent_count(0) == 0
    assert calculate_aggregated_risk_from_parts(
        max_score=9.0,
        top_percent_avg=9.0,
        average_score=9.0,
        total_score=9.0,
        scored_count=0,
    ) == 0.0


def test_rollup_clamps_child_scores_and_stays_bounded():
    result = calculate_aggregated_risk([12.0, 8.0, -3.0, None])

    assert 0.0 <= result <= 10.0
    assert result == calculate_aggregated_risk([10.0, 8.0, 0.0])


def test_rollup_top_percent_count_rounds_to_at_least_one():
    assert calculate_top_percent_count(1) == 1
    assert calculate_top_percent_count(2) == 1
    assert calculate_top_percent_count(7) == 1
    assert calculate_top_percent_count(8) == 2
    assert calculate_top_percent_count(20) == 4


def test_rollup_formula_from_precomputed_parts_includes_volume_pressure():
    expected_log_volume = calculate_log_scaled_volume(total_score=25.0, scored_count=4)
    expected = round(
        (0.25 * 9.0)
        + (0.35 * 8.0)
        + (0.20 * 6.25)
        + (0.20 * expected_log_volume),
        2,
    )

    assert calculate_aggregated_risk_from_parts(
        max_score=9.0,
        top_percent_avg=8.0,
        average_score=6.25,
        total_score=25.0,
        scored_count=4,
    ) == pytest.approx(expected)


def test_rollup_prioritizes_high_children_over_many_low_children():
    high_cluster = calculate_aggregated_risk([9.5, 8.8, 8.0, 3.0])
    many_low = calculate_aggregated_risk([2.0] * 20)

    assert high_cluster > many_low
