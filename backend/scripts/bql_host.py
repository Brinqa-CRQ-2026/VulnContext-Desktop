import os
import pandas as pd
from bql_Client import BrinqaBQLClient
"""
Fetch all the host object from Brinqa's server to the csv

"""

API_URL = "https://ucsc.brinqa.net/api/caasm/bql"

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(BASE_DIR, exist_ok=True)
OUT_PATH = os.path.join(BASE_DIR, "hosts_export.csv")

LIMIT = 1000

FIELDS = [
    "id", "uid", "displayName", "name", "type",
    "subnets", "operatingSystem", "osFamily",
    "cloudProvider", "cloudRegion",
    "environments", "profiles", "tags", "technologies",
    "openFindingCount","publicIpAddresses"
]

def main():
    # the request header that later use to send to the Brinqa API
    client = BrinqaBQLClient(
        api_url=API_URL,
        origin="https://ucsc.brinqa.net",
        referer="https://ucsc.brinqa.net/caasm/hosts",
        timeout_sec=90,
    )
    # Define the query context, tells the Brinqa server the data model I want to fetch
    calling_context = {
        "rootContextType": "DATA_MODEL",
        "rootContextName": "hostDefaultList",
        "viewType": "LIST",
        "rootDataModel": "Host",
        "returnDataModel": "Host",
    }
    # it used the header, query context to send API request and extract the page of results from the Brinqa's server
    rows = client.paged_dataset(
        calling_context=calling_context,
        query='FIND Host AS h WHERE h.__appName__ = "caasm"',
        returning_fields=FIELDS,
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