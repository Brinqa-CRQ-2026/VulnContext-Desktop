"""Placeholder Brinqa detail services.

The current backend intentionally does not fetch live Brinqa detail payloads at
request time. Detail routes should return only the persisted thin fields stored
in `assets` and `findings`.

This module preserves the service interface so a future implementation can be
added cleanly without changing route code again.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app import models


@dataclass
class DetailResult:
    payload: dict[str, Any] | None
    fetched_at: datetime | None
    source: str | None


class BrinqaFindingDetailService:
    def get_detail(self, finding: models.Finding) -> DetailResult:
        _ = finding
        return DetailResult(payload=None, fetched_at=None, source=None)


class BrinqaAssetDetailService:
    def get_detail(self, asset: models.Asset) -> DetailResult:
        _ = asset
        return DetailResult(payload=None, fetched_at=None, source=None)


finding_detail_service = BrinqaFindingDetailService()
asset_detail_service = BrinqaAssetDetailService()
