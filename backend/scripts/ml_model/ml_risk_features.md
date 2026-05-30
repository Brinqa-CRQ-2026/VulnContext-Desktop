# ML Risk Feature Sync Pipeline

## Overview

This pipeline fetches vulnerability, asset, and CVE enrichment data from Brinqa and NVD, builds ML feature rows, and stores them into the `ml_risk_features` table in Supabase/Postgres.

The architecture is split into modular components to separate:

* configuration
* Brinqa API fetching
* parsing/normalization
* NVD enrichment
* feature engineering
* database persistence
* orchestration

---

# Folder Structure

```text
backend/
│
├── app/
│   ├── models.py
│   ├── schemas.py
│   └── core/
│       └── db.py
│
├── data/
│   └── NVD_Download/
│       ├── nvdcve-2.0-2002.json.gz
│       ├── nvdcve-2.0-2003.json.gz
│       └── ...
│
└── scripts/
    └── ml_model/
        ├── bql_Client.py
        │
        └── ml_feature_builder/
            ├── ml_risk_features.py
            ├── config.py
            ├── brinqa_fetcher.py
            ├── parsing.py
            ├── feature_builder.py
            ├── nvd_enrichment.py
            ├── db_writers.py
            └── __init__.py
```

---

# File Responsibilities

---

# 1. ml_risk_features.py

## Purpose

Main orchestration runner.

This file coordinates the entire pipeline:

```text
Brinqa
    ↓
Fetch data
    ↓
Build features
    ↓
Enrich CVEs
    ↓
Upsert into Supabase
```

---

## Responsibilities

### Initializes database

```python
Base.metadata.create_all(bind=engine)
```

Creates missing SQLAlchemy tables.

---

### Creates Brinqa client

```python
client = BrinqaBQLClient(...)
```

Used for all Brinqa BQL requests.

---

### Fetches core datasets

```python
hosts = fetch_hosts(client)
finding_defs = fetch_finding_definitions(client)
```

---

### Builds NVD lookup

```python
nvd_lookup = build_nvd_lookup()
```

Loads CVSS metrics from local NVD JSON files.

---

### Processes vulnerability pages

```python
while True:
```

Fetches vulnerabilities page-by-page to avoid memory explosion.

---

### Builds ML feature rows

```python
feature_rows = build_feature_rows(...)
```

Converts raw Brinqa/NVD data into ML-ready feature dictionaries.

---

### Upserts rows into database

```python
upsert_ml_risk_feature(db, row)
```

Updates existing findings or inserts new ones.

---

# 2. config.py

## Purpose

Centralized configuration/constants.

Contains:

* API URLs
* regex patterns
* pagination limits
* field lists
* NVD paths

---

## Why Important

Keeps configuration separate from logic.

Without this file:

```text
magic values
hardcoded constants
duplicated configs
```

would appear everywhere.

---

## Examples

### Pagination size

```python
PAGE_SIZE = 1000
```

---

### CVE regex

```python
CVE_RE = re.compile(...)
```

---

### Brinqa return fields

```python
HOST_FIELDS
VULN_FIELDS
FINDING_DEF_FIELDS
```

Defines exactly which fields Brinqa should return.

---

# 3. brinqa_fetcher.py

## Purpose

All Brinqa API communication logic.

Responsible ONLY for fetching data.

---

## Responsibilities

### Fetch hosts

```python
fetch_hosts()
```

Retrieves Host objects.

---

### Fetch vulnerabilities

```python
fetch_vulnerability_page()
```

Retrieves vulnerability pages incrementally.

---

### Fetch finding definitions

```python
fetch_finding_definitions()
```

Retrieves CVE metadata and CVSS metrics.

---

### Build container lookup

```python
build_container_lookup()
```

Fetches container records in batches.

Important because vulnerabilities may target:

```text
Host
Container
```

and containers must map back to hosts.

---

# 4. parsing.py

## Purpose

Data normalization and safe parsing utilities.

Brinqa returns many fields as:

```text
JSON strings
lists
dicts
metadata blobs
null-like values
```

This file standardizes them.

---

## Responsibilities

### Safe JSON parsing

```python
safe_parse_any()
```

Safely parses:

* JSON
* Python literals
* lists
* dicts

without crashing.

---

### Normalize lists

```python
safe_parse_list()
```

Ensures returned value is always a list.

---

### Extract display values

```python
extract_display_values()
```

Extracts readable labels from metadata structures.

---

### Extract CVE IDs

```python
extract_cve_id()
```

Uses regex to locate:

```text
CVE-XXXX-XXXX
```

inside vulnerability fields.

---

### Convert numeric safely

```python
to_float()
```

Prevents crashes from malformed numeric values.

---

### Detect missing metrics

```python
is_missing_metric()
```

Handles:

```text
None
undefined
Not defined
nan
```

which appear frequently in Brinqa CVSS data.

---

# 5. nvd_enrichment.py

## Purpose

Loads and enriches CVE data from NVD.

---

## Why Needed

Brinqa CVSS data is often incomplete.

Example:

```text
BaseScore exists
AttackVector = "Not defined"
```

This module fills missing metrics using NVD.

---

## Responsibilities

### Load NVD JSON/GZ

```python
load_json_maybe_gz()
```

Loads compressed yearly NVD feeds.

---

### Build NVD lookup

```python
build_nvd_lookup()
```

Creates:

```python
{
    "CVE-2020-1712": {
        ...
    }
}
```

dictionary.

---

### Merge metrics

```python
merged_cve_metrics()
```

Logic:

```text
Prefer Brinqa metric
Else fallback to NVD
```

This is critical enrichment logic.

---

# 6. feature_builder.py

## Purpose

Core feature engineering logic.

This is the heart of the ML pipeline.

---

## Responsibilities

### Extract target relationships

```python
extract_target_rows()
```

Converts vulnerabilities into:

```text
finding
↔ asset
↔ target
↔ cve
```

relationships.

---

### Build CVE lookup

```python
build_finding_definition_lookup()
```

Maps:

```text
CVE → FindingDefinition
```

---

### Determine internet exposure

```python
is_internet_exposed()
```

Uses public IP existence as exposure signal.

---

### Build final ML feature rows

```python
build_feature_rows()
```

Combines:

* vulnerability data
* asset context
* container mapping
* host metadata
* CVE enrichment
* NVD metrics

into:

```python
{
    "finding_id": "...",
    "asset_id": "...",
    ...
}
```

ML-ready rows.

---

## Output

Returns:

```python
list[dict[str, Any]]
```

Each dictionary maps directly to:

```python
models.MLRiskFeature
```

database rows.

---

# 7. db_writers.py

## Purpose

Database persistence layer.

Handles database writes only.

---

## Responsibilities

### Upsert ML feature rows

```python
upsert_ml_risk_feature()
```

Behavior:

```text
if finding exists:
    update row
else:
    insert row
```

Prevents duplicate findings.

---

## Why Important

Allows pipeline reruns safely.

Existing rows refresh automatically.

---

# 8. bql_Client.py

## Purpose

Reusable Brinqa API client wrapper.

Encapsulates:

* authentication
* headers
* pagination
* request handling
* response normalization

---

## Responsibilities

### Session management

Uses:

```python
requests.Session()
```

for persistent authenticated requests.

---

### Brinqa POST requests

```python
post()
```

Handles:

* HTTP errors
* response normalization
* envelope unwrapping

---

### Pagination helper

```python
paged_dataset()
```

Automatically loops through pages.

---

# Database Model Relationship

The generated feature rows map directly into:

```python
models.MLRiskFeature
```

which maps to:

```sql
ml_risk_features
```

inside Supabase/Postgres.

---

# Overall Pipeline Flow

```text
Brinqa Hosts
        ↓
Brinqa Vulnerabilities
        ↓
Brinqa FindingDefinitions
        ↓
NVD CVE Metrics
        ↓
Feature Builder
        ↓
ML Feature Rows
        ↓
Supabase/Postgres
```

---

# Running the Pipeline

Run from backend root:

```powershell
python scripts/ml_model/ml_feature_builder/ml_risk_features.py
```

---

# Testing with Small Dataset

Limit to first page:

```python
max_pages = 1
```

and optionally:

```python
max_pages=1
```

inside:

```python
fetch_hosts()
fetch_finding_definitions()
```

to avoid loading hundreds of thousands of rows.

---

# Important Operational Notes

## Token Expiration

Brinqa sessions may expire during long runs.

Recommended future improvements:

* checkpointing
* caching
* retry logic
* resumable syncs

---

## Large Dataset Concerns

Production datasets may exceed:

```text
200k+ vulnerabilities
```

Use page-by-page processing to avoid memory issues.

---

# Future Improvements

Potential future enhancements:

* async processing
* Redis caching
* bulk upserts
* incremental syncs
* checkpoint recovery
* ML inference integration
* prediction refresh scheduling
* feature drift monitoring
