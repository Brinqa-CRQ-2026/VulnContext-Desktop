"""Manual asset scoring using persisted CRQ finding scores and asset context."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core.db import SQLALCHEMY_DATABASE_URL, SessionLocal, engine
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
    parser.add_argument(
        "--require-postgres",
        action="store_true",
        help="Fail if the resolved database URL is not PostgreSQL/Supabase.",
    )
    return parser


def _target_label(database_url: str) -> str:
    if database_url.startswith(("postgresql://", "postgres://")):
        return "PostgreSQL/Supabase"
    if database_url.startswith("sqlite://"):
        return "SQLite/local"
    return "unknown database"


def main() -> int:
    args = build_parser().parse_args()
    if args.require_postgres and not SQLALCHEMY_DATABASE_URL.startswith(
        ("postgresql://", "postgres://")
    ):
        print(
            "Refusing to score because --require-postgres was set, "
            f"but resolved database target is {_target_label(SQLALCHEMY_DATABASE_URL)}.",
            file=sys.stderr,
        )
        return 2

    with SessionLocal() as db:
        require_asset_scoring_columns(engine)
        updated = score_assets(db, asset_ids=args.asset_ids)
        print(
            f"Scored {updated} asset rows with asset CRQ {ASSET_SCORING_VERSION} "
            f"on {_target_label(SQLALCHEMY_DATABASE_URL)}."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
