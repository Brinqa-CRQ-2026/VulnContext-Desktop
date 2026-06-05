"""Manual business-service scoring using persisted application and asset CRQ scores."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core.db import SQLALCHEMY_DATABASE_URL, SessionLocal, engine
from app.services.scoring.crq_business_service import (
    BUSINESS_SERVICE_SCORING_VERSION,
    require_business_service_scoring_columns,
    score_business_services_and_business_units,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Manually score business services with the current CRQ business-service model."
    )
    parser.add_argument(
        "--business-service-id",
        action="append",
        dest="business_service_ids",
        help="Limit scoring to one or more business_services.id values.",
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
        require_business_service_scoring_columns(engine)
        updated_services, updated_units = score_business_services_and_business_units(
            db,
            business_service_ids=args.business_service_ids,
        )
        print(
            f"Scored {updated_services} business service rows and {updated_units} "
            f"business unit rows with business-service CRQ "
            f"{BUSINESS_SERVICE_SCORING_VERSION} on {_target_label(SQLALCHEMY_DATABASE_URL)}."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
