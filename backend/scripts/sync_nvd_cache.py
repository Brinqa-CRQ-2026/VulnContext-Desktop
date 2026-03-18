#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.db import SessionLocal
from app.core.env import load_backend_env
from app.services.nvd_enrichment import (
    bootstrap_nvd_cache,
    update_nvd_cache_from_modified_feed,
)


def main(argv: list[str]) -> int:
    load_backend_env()
    mode = argv[1].strip().lower() if len(argv) > 1 else "modified"

    db = SessionLocal()
    try:
        if mode == "bootstrap":
            result = bootstrap_nvd_cache(db)
        elif mode == "modified":
            result = update_nvd_cache_from_modified_feed(db)
        else:
            raise SystemExit("Usage: python3 scripts/sync_nvd_cache.py [bootstrap|modified]")
    finally:
        db.close()

    print({"mode": mode, **result})
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
