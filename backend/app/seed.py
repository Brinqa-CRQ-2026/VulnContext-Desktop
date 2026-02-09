# app/seed.py
import csv
from pathlib import Path

from app.core.db import SessionLocal, engine, Base
from app.models import ScoredFinding
from app.scoring import score_finding_dict

DATA_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "synthetic_qualys_findings_v2.csv"
)

ASSET_CRITICALITY_MAP = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}

def seed_db_from_csv():
    Base.metadata.create_all(bind=engine)

    if not DATA_PATH.exists():
        raise FileNotFoundError(f"CSV file not found at: {DATA_PATH}")

    db = SessionLocal()
    try:
        existing_count = db.query(ScoredFinding).count()
        if existing_count > 0:
            print(f"[seed] Database already has {existing_count} rows. Skipping seed.")
            return

        print(f"[seed] Seeding database from {DATA_PATH} ...")

        with DATA_PATH.open("r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows_to_add = []

            for row in reader:
                asset_crit_label = row["asset_criticality"].strip()
                crit_key = asset_crit_label.lower()
                if crit_key not in ASSET_CRITICALITY_MAP:
                    raise ValueError(f"Unknown asset_criticality value: '{asset_crit_label}'")
                asset_crit_numeric = ASSET_CRITICALITY_MAP[crit_key]

                internet_exposed = row["internet_exposed"].strip().lower() in ("1", "true", "yes")
                auth_required = row["auth_required"].strip().lower() in ("1", "true", "yes")

                vuln_age_days = int(row["vuln_age_days"])
                times_detected = int(row["times_detected"])

                raw_finding = {
                    "finding_id": row["finding_id"],
                    "asset_id": row["asset_id"],
                    "hostname": row.get("hostname"),
                    "ip_address": row.get("ip_address"),
                    "operating_system": row.get("operating_system"),
                    "asset_type": row.get("asset_type"),

                    "cvss_score": float(row["cvss_score"]),
                    "epss_score": float(row["epss_score"]),
                    "internet_exposed": internet_exposed,
                    "asset_criticality_label": asset_crit_label,
                    "asset_criticality": asset_crit_numeric,
                    "vuln_age_days": vuln_age_days,
                    "auth_required": auth_required,

                    "cve_id": row.get("cve_id"),
                    "cwe_id": row.get("cwe_id"),
                    "description": row.get("description"),
                    "cvss_severity": row.get("cvss_severity"),
                    "attack_vector": row.get("attack_vector"),
                    "privileges_required": row.get("privileges_required"),
                    "user_interaction": row.get("user_interaction"),
                    "vector_string": row.get("vector_string"),
                    "vuln_published_date": row.get("vuln_published_date"),
                    "port": int(row["port"]) if row.get("port") else None,
                    "service": row.get("service"),
                    "detection_method": row.get("detection_method"),
                    "first_detected": row.get("first_detected"),
                    "last_detected": row.get("last_detected"),
                    "times_detected": times_detected,
                }

                scored = score_finding_dict(raw_finding)

                db_obj = ScoredFinding(
                    finding_id=scored["finding_id"],
                    asset_id=scored["asset_id"],
                    hostname=scored.get("hostname"),
                    ip_address=scored.get("ip_address"),
                    operating_system=scored.get("operating_system"),
                    asset_type=scored.get("asset_type"),

                    asset_criticality=scored["asset_criticality"],

                    cve_id=scored.get("cve_id"),
                    cwe_id=scored.get("cwe_id"),
                    description=scored.get("description"),

                    cvss_score=scored["cvss_score"],
                    cvss_severity=scored.get("cvss_severity"),
                    epss_score=scored["epss_score"],

                    attack_vector=scored.get("attack_vector"),
                    privileges_required=scored.get("privileges_required"),
                    user_interaction=scored.get("user_interaction"),
                    vector_string=scored.get("vector_string"),

                    vuln_published_date=scored.get("vuln_published_date"),
                    vuln_age_days=scored.get("vuln_age_days"),
                    port=scored.get("port"),
                    service=scored.get("service"),
                    internet_exposed=scored["internet_exposed"],
                    auth_required=scored["auth_required"],
                    detection_method=scored.get("detection_method"),
                    first_detected=scored.get("first_detected"),
                    last_detected=scored.get("last_detected"),
                    times_detected=scored.get("times_detected"),

                    risk_score=scored["risk_score"],
                    risk_band=scored["risk_band"],
                )
                rows_to_add.append(db_obj)

        db.add_all(rows_to_add)
        db.commit()
        print(f"[seed] Inserted {len(rows_to_add)} rows into scored_findings.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_db_from_csv()