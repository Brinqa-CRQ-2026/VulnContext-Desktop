"""Manual CRQ scoring for findings using local enrichment tables only."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.db import SessionLocal, engine
from app.services.crq_finding_scoring import (
    CRQ_VERSION,
    preview_scores,
    require_crq_columns,
    score_findings,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manually score findings with the current CRQ model.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview the computed CRQ values without writing them back.",
    )
    parser.add_argument(
        "--finding-id",
        action="append",
        dest="finding_ids",
        help="Limit scoring to one or more finding_id values.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()

    with SessionLocal() as db:
        if args.dry_run:
            preview = preview_scores(db, finding_ids=args.finding_ids)
            for row in preview[:20]:
                print(row)
            print(f"Previewed {len(preview)} finding rows.")
            return 0

        require_crq_columns(engine)
        updated = score_findings(db, finding_ids=args.finding_ids)
        print(f"Scored {updated} finding rows with CRQ {CRQ_VERSION}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
