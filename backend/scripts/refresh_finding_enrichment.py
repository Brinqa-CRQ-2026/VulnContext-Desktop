#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.db import SessionLocal
from app.core.env import load_backend_env
from app.core.risk_weights import get_or_create_scoring_config, weights_from_config
from app.seed import refresh_persisted_findings_with_epss
from app.services.nvd_enrichment import refresh_persisted_findings_with_nvd_cache


def main() -> int:
    load_backend_env()
    db = SessionLocal()
    try:
        config = get_or_create_scoring_config(db)
        weights = weights_from_config(config)
        epss_updated = refresh_persisted_findings_with_epss(db, weights=weights)
        nvd_updated = refresh_persisted_findings_with_nvd_cache(db, weights=weights)
        db.commit()
    finally:
        db.close()

    print(
        {
            "epss_updated": epss_updated,
            "nvd_updated": nvd_updated,
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
