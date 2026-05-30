from __future__ import annotations

import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[3]
ML_MODEL_ROOT = Path(__file__).resolve().parents[1]

for path in (BACKEND_ROOT, ML_MODEL_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from app.core.db import Base, SessionLocal, engine
from bql_Client import BrinqaBQLClient

from brinqa_fetcher import (
    fetch_finding_definitions,
    fetch_hosts,
    fetch_vulnerability_page,
)
from config import API_URL, PAGE_SIZE
from db_writers import upsert_ml_risk_feature
from feature_builder import build_feature_rows
from nvd_enrichment import build_nvd_lookup


def main() -> None:
    load_dotenv()
    Base.metadata.create_all(bind=engine)

    client = BrinqaBQLClient(
        api_url=API_URL,
        origin="https://ucsc.brinqa.net",
        referer="https://ucsc.brinqa.net/caasm",
        timeout_sec=90,
    )

    print("Fetching hosts...")
    hosts = fetch_hosts(client)

    print("Fetching finding definitions...")
    finding_defs = fetch_finding_definitions(client)

    print("Building NVD lookup...")
    nvd_lookup = build_nvd_lookup()

    skip = 0
    total_processed = 0

    db = SessionLocal()
    # page = 0
    # max_pages = 1

    try:
        while True:
            # page += 1
            print(f"\nFetching vulnerability page skip={skip}")

            vulns = fetch_vulnerability_page(
                client,
                skip=skip,
                limit=PAGE_SIZE,
            )

            if not vulns:
                break

            feature_rows = build_feature_rows(
                client=client,
                hosts=hosts,
                vulns=vulns,
                finding_defs=finding_defs,
                nvd_lookup=nvd_lookup,
            )

            print("Built feature rows:", len(feature_rows))

            for row in feature_rows:
                upsert_ml_risk_feature(db, row)

            db.commit()
            # if page > max_pages:
            #   break

            total_processed += len(feature_rows)
            print("Total processed:", total_processed)

            skip += PAGE_SIZE

        print(f"Done. Upserted {total_processed} ML risk feature rows.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()