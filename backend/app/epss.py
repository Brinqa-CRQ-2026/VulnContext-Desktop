import csv
import gzip
import requests
from io import TextIOWrapper
from sqlalchemy import text
from app.core.db import SessionLocal
from app.models import EpssScore

EPSS_DAILY_URL = "https://epss.empiricalsecurity.com/epss_scores-current.csv.gz"
BATCH_SIZE = 10000

def get_epss_scores():
    resp = requests.get(EPSS_DAILY_URL, stream=True, timeout=30)
    resp.raise_for_status()

    db = SessionLocal()

    try:
        db.execute(text("DELETE FROM epss_scores")) # Clear old EPSS data

        with gzip.GzipFile(fileobj=resp.raw) as gz:
            text_stream = TextIOWrapper(gz, encoding="utf-8")
            next(text_stream)  # Skip metadata
            reader = csv.DictReader(text_stream)

            batch = []

            for row in reader:
                batch.append({
                    "cve_id": row["cve"],
                    "probability": float(row["epss"]),
                    "percentile": float(row["percentile"]),
                })

                if len(batch) >= BATCH_SIZE:
                    db.bulk_insert_mappings(EpssScore, batch)
                    batch.clear()

            if batch:
                db.bulk_insert_mappings(EpssScore, batch)

        db.commit()

    finally:
        db.close()

