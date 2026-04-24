import pandas as pd
import requests
from io import BytesIO
import os
import gzip
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

EPSS_URL = "https://epss.cyentia.com/epss_scores-current.csv.gz"
BATCH_SIZE = 1000

def fetch_epss():
    headers = {"User-Agent": "Mozilla/5.0"}

    print("Downloading EPSS...")
    r = requests.get(EPSS_URL, headers=headers)
    r.raise_for_status()

    with gzip.open(BytesIO(r.content), "rt") as f:
        first_line = f.readline().strip()

    parts = first_line.split(",")
    score_date = None
    for part in parts:
        if "score_date:" in part:
            score_date = part.split("score_date:")[1]

    print("Score date:", score_date)

    print("Parsing CSV...")
    df = pd.read_csv(
        BytesIO(r.content),
        compression="gzip",
        engine="python",
        skiprows=1
    )

    df["date"] = score_date
    df["date_fetched"] = datetime.now(timezone.utc).isoformat()

    print(f"Loaded {len(df)} rows")
    return df

def upload_to_supabase(df):
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    records = df.to_dict(orient="records")

    print("Uploading in batches...")

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]

        print(f"Uploading {i} → {i + len(batch)}")

        try:
            supabase.table("epss_scores").upsert(batch).execute()
        except Exception as e:
            print(f"Error at batch {i}: {e}")
            continue

    print("Upload complete!")

def main():
    print("Starting EPSS sync...")

    df = fetch_epss()

    print("Testing with first 100 rows...")
    upload_to_supabase(df.head(100))

    print("Test complete — check Supabase before full upload")

    upload_to_supabase(df)

    print("EPSS sync finished.")

if __name__ == "__main__":
    main()