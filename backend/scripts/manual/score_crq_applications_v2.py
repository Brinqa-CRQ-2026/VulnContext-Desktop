"""Manual application scoring using persisted asset CRQ scores."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core.db import SQLALCHEMY_DATABASE_URL, SessionLocal, engine
from app.services.crq_application_scoring import (
    APPLICATION_SCORING_VERSION,
    require_application_scoring_columns,
    score_applications,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Manually score applications with the current CRQ application model."
    )
    parser.add_argument(
        "--application-id",
        action="append",
        dest="application_ids",
        help="Limit scoring to one or more applications.id values.",
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
        require_application_scoring_columns(engine)
        updated = score_applications(db, application_ids=args.application_ids)
        print(
            f"Scored {updated} application rows with application CRQ "
            f"{APPLICATION_SCORING_VERSION} on {_target_label(SQLALCHEMY_DATABASE_URL)}."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
