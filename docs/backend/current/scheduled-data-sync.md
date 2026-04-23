# Automated Vulnerability Data Pipeline (Supabase + GitHub Actions)

## Overview

This system automates the ingestion of vulnerability intelligence data into a Supabase database using scheduled GitHub Actions workflows.

The pipeline integrates three major data sources:

- **EPSS** (Exploit Prediction Scoring System) → probability of exploitation  
- **KEV** (Known Exploited Vulnerabilities) → confirmed real-world exploitation  
- **NVD** (National Vulnerability Database) → CVSS severity scores  

The goal is to maintain an up-to-date dataset for vulnerability prioritization and risk scoring.

---

## System Architecture
```
GitHub Actions (cron)
↓
Python scripts (data ingestion)
↓
Supabase (Postgres database)
```


---

## Data Sources

### EPSS
- Source: https://epss.cyentia.com/
- Format: gzipped CSV
- Data: CVE → EPSS score + percentile
- Update Frequency: Daily

---

### KEV (CISA)
- Source: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- Format: JSON
- Data: CVEs actively exploited in the wild
- Update Frequency: Regular (treated as daily)

---

### NVD
- Source: https://services.nvd.nist.gov/rest/json/cves/2.0
- Format: REST API (paginated JSON)
- Data: CVE → CVSS score + severity
- Update Frequency: Continuous (synced weekly)

---

## Repository Structure
```
backend/
    scripts/
        sync_epss.py
        sync_kev.py
        sync_nvd.py
        sync_daily.py
    requirements.txt

.github/
    workflows/
        sync_daily.yml
        sync_nvd.yml
```

---

## Script Descriptions

### sync_epss.py
- Downloads EPSS dataset
- Decompresses and parses CSV
- Extracts:
  - CVE
  - EPSS score
  - Percentile
- Adds `date_fetched` timestamp
- Uploads to Supabase (`epss_scores` table) using batch upserts

---

### sync_kev.py
- Fetches KEV catalog (JSON)
- Extracts CVE identifiers
- Uploads to `kev` table in Supabase

---

### sync_nvd.py
- Pulls CVE data from NVD API using pagination
- Extracts:
  - CVE ID
  - CVSS score
  - CVSS severity
- Handles:
  - Rate limiting (HTTP 429)
  - Retry logic
- Streams data in batches to Supabase (`nvd` table)

---

### sync_daily.py
- Orchestrates the daily workflow:
```
sync_epss → sync_kev → update_is_kev
```
- Runs EPSS and KEV ingestion
- Updates `is_kev` flag via database function

---

## Database Schema (Supabase)

### epss_scores
| Column        | Type       | Description                  |
|---------------|------------|------------------------------|
| cve           | text (PK)  | CVE ID                       |
| epss          | float      | EPSS score                   |
| percentile    | float      | EPSS percentile              |
| date_fetched  | timestamptz| Timestamp of last sync       |
| is_kev        | boolean    | True if CVE exists in KEV    |
---

### kev
| Column | Type | Description   |
|--------|------|---------------|
| cve    | text | CVE ID        |

---

### nvd
| Column         | Type   | Description             |
|----------------|--------|-------------------------|
| cve            | text   | CVE ID                  |
| cvss_score     | float  | CVSS base score         |
| cvss_severity  | text   | Severity classification |

---

## Derived Data

### is_kev Flag

The `is_kev` field is computed using a database function:

```sql
update epss_scores e
set is_kev = exists (
    select 1 from kev k where k.cve = e.cve
);
```
This allows fast identification of actively exploited vulnerabilities.

## Scheduling (GitHub Actions)

Workflows are defined in:
```.github/workflows/```

---

### Daily Workflow — sync_daily.yml

- Runs: `sync_daily.py`

Schedule:
```0 9 * * *```
(Runs every day at 09:00 UTC)

Responsibilities:
- Refresh EPSS data
- Refresh KEV data
- Update `is_kev` flag

---

### Weekly Workflow — sync_nvd.yml

- Runs: `sync_nvd.py`

Schedule:
```0 10 * * 1```
(Runs every Monday at 10:00 UTC)

Responsibilities:
- Refresh CVSS data from NVD

---

## Execution Environment

- GitHub-hosted Ubuntu runner
- Python 3.11
- Dependencies installed via:
```pip install -r backend/requirements.txt```
---

## Environment Variables

Stored securely as GitHub Secrets:

- `SUPABASE_URL`
- `SUPABASE_KEY`

Accessed in Python using:

```python
os.getenv("SUPABASE_URL")
```

## Data Validation

### date_fetched

- A `date_fetched` column is added to the EPSS dataset
- Stores the timestamp of the most recent sync
- Used to verify that scheduled workflows are running correctly
- Stored as an ISO 8601 timestamp compatible with `timestamptz`

Example:```2026-04-22T09:00:03+00:00```

---

## Error Handling

### NVD API

- Handles HTTP 429 (rate limiting)
- Implements retry logic with delay/backoff
- Ensures full dataset can be retrieved without manual intervention

---

### Supabase Upload

- Uses batch processing for large datasets
- Logs errors at the batch level
- Continues execution even if individual batches fail

---

## Notes

- GitHub Actions cron jobs run in UTC
- Scheduled workflows may execute with slight delays
- NVD ingestion is slower due to API pagination and rate limits
- EPSS and KEV ingestion are lightweight and run quickly

---

## Future Improvements

- Implement incremental NVD updates instead of full ingestion
- Add monitoring and alerting for failed workflows
- Track workflow execution metadata (e.g., run ID, timestamp, status)
- Build a unified risk scoring model combining:
  - EPSS (likelihood)
  - KEV (active exploitation)
  - CVSS (severity)