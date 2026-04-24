import os
from dotenv import load_dotenv
from supabase import create_client

from sync_epss import main as sync_epss
from sync_kev import main as sync_kev
from sync_nvd import process_and_upload as sync_nvd

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


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