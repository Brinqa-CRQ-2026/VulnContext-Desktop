import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.automation.sync_epss import main as sync_epss
from scripts.automation.sync_kev import main as sync_kev

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def update_is_kev():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Updating is_kev flags...")

    supabase.rpc("update_is_kev").execute()

    print("is_kev update complete!")


def main():
    print("Starting full sync pipeline...\n")

    print("=== EPSS SYNC ===")
    sync_epss()

    print("\n=== KEV SYNC ===")
    sync_kev()

    print("\n=== KEV FLAG UPDATE ===")
    update_is_kev()

    print("\nDaily sync complete!")


if __name__ == "__main__":
    main()
