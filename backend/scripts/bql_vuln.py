import os
import pandas as pd
from bql_Client import BrinqaBQLClient

"""
Fetch all the vulnerability object from Brinqa's server to the csv

"""

API_URL = "https://ucsc.brinqa.net/api/caasm/bql"

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(BASE_DIR, exist_ok=True)
OUT_PATH = os.path.join(BASE_DIR, "vulnerabilities_export.csv")

LIMIT = 1000

RETURNING_FIELDS = [
    "id", "uid", "displayName", "name", "summary",
    "ageInDays", "dateCreated", "firstFound", "lastFound", "lastUpdated", "lastFixed", "daysToFix",
    "status", "severity", "complianceStatus",
    "targets",
    "riskScore", "riskRating", "riskFactors", "riskScoringModel",
    "connectorNames", "connectorCategories",
]

def main():
    client = BrinqaBQLClient(
        api_url=API_URL,
        origin="https://ucsc.brinqa.net",
        referer="https://ucsc.brinqa.net/caasm/vulnerabilities",
        timeout_sec=90,
    )

    calling_context = {
        "rootContextType": "DATA_MODEL",
        "rootContextName": "vulnerabilityDefaultList",
        "viewType": "LIST",
        "rootDataModel": "Vulnerability",
        "returnDataModel": "Vulnerability",
    }

    rows = client.paged_dataset(
        calling_context=calling_context,
        query='FIND Vulnerability AS v WHERE v.__appName__ = "caasm"',
        returning_fields=RETURNING_FIELDS,
        limit=LIMIT,
        refresh=True,
    )

    df = pd.DataFrame(rows)
    df.to_csv(OUT_PATH, index=False)
    print("Saved:", OUT_PATH)
    print("rows:", len(df))
    print("columns:", df.columns.tolist())

if __name__ == "__main__":
    main()