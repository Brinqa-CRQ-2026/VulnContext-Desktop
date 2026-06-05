# Data Contract Tests

## Files

- `backend/tests/data_contracts/test_asset_reseed_csv.py`

## Backend Coverage

- `backend/data/assets_for_supabase.csv`
- `backend/data/assets_source_detail.csv`
- `backend/data/asset_business_context.csv`
- asset reseed CSV expectations used by manual Supabase reseed workflows

## Cases Covered

- Generated asset CSV row count matches the source detail CSV.
- Asset IDs are unique.
- CSV columns match the expected reseed contract.
- Expected business-service/application pair counts are preserved.
- Tags and environment values are derived consistently from asset business context.

## Not Covered Here

- Live database reseed execution.
- Supabase copy/import behavior.
- Manual script CLI parsing or database error handling.
