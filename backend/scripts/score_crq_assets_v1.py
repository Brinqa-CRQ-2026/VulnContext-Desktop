"""Manual asset scoring using persisted CRQ finding scores and asset context."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.db import SessionLocal, engine
from app.services.crq_asset_scoring import (
    ASSET_SCORING_VERSION,
    require_asset_scoring_columns,
    score_assets,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manually score assets with the current CRQ asset model.")
    parser.add_argument(
        "--asset-id",
        action="append",
        dest="asset_ids",
        help="Limit scoring to one or more asset_id values.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()

    with SessionLocal() as db:
        require_asset_scoring_columns(engine)
        updated = score_assets(db, asset_ids=args.asset_ids)
        print(f"Scored {updated} asset rows with asset CRQ {ASSET_SCORING_VERSION}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
