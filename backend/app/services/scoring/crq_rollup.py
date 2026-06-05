"""Shared CRQ rollup scoring helpers."""

from __future__ import annotations

import math
from collections.abc import Sequence

MAX_SCORE_WEIGHT = 0.25
TOP_PERCENT_AVG_WEIGHT = 0.35
AVERAGE_SCORE_WEIGHT = 0.20
LOG_SCALED_VOLUME_WEIGHT = 0.20
TOP_PERCENT = 0.20


def _clamp(value: float, *, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, float(value)))


def _round_score(value: float) -> float:
    return round(value, 2)


def calculate_log_scaled_volume(*, total_score: float, scored_count: int) -> float:
    if scored_count <= 0:
        return 0.0
    return (math.log(1 + total_score) / math.log(1 + (scored_count * 10))) * 10


def calculate_top_percent_count(scored_count: int) -> int:
    if scored_count <= 0:
        return 0
    return max(1, int(math.floor((scored_count * TOP_PERCENT) + 0.5)))


def calculate_aggregated_risk_from_parts(
    *,
    max_score: float,
    top_percent_avg: float,
    average_score: float,
    total_score: float,
    scored_count: int,
) -> float:
    """Aggregate precomputed 0-10 child score parts into a 0-10 CRQ rollup."""
    if scored_count <= 0:
        return 0.0

    log_scaled_volume = calculate_log_scaled_volume(
        total_score=total_score,
        scored_count=scored_count,
    )
    aggregated = (
        (MAX_SCORE_WEIGHT * _clamp(max_score, minimum=0.0, maximum=10.0))
        + (TOP_PERCENT_AVG_WEIGHT * _clamp(top_percent_avg, minimum=0.0, maximum=10.0))
        + (AVERAGE_SCORE_WEIGHT * _clamp(average_score, minimum=0.0, maximum=10.0))
        + (LOG_SCALED_VOLUME_WEIGHT * _clamp(log_scaled_volume, minimum=0.0, maximum=10.0))
    )
    return _round_score(_clamp(aggregated, minimum=0.0, maximum=10.0))


def calculate_aggregated_risk(scores: Sequence[float | None] | None) -> float:
    """Aggregate 0-10 child scores into a 0-10 CRQ rollup."""
    if not scores:
        return 0.0

    normalized_scores = [
        _clamp(score, minimum=0.0, maximum=10.0)
        for score in scores
        if score is not None
    ]
    if not normalized_scores:
        return 0.0

    sorted_scores = sorted(normalized_scores, reverse=True)
    total_score = sum(sorted_scores)
    scored_count = len(sorted_scores)
    top_percent_count = calculate_top_percent_count(scored_count)
    top_percent_scores = sorted_scores[:top_percent_count]

    return calculate_aggregated_risk_from_parts(
        max_score=sorted_scores[0],
        top_percent_avg=sum(top_percent_scores) / len(top_percent_scores),
        average_score=total_score / scored_count,
        total_score=total_score,
        scored_count=scored_count,
    )
