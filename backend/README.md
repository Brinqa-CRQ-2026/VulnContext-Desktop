# Backend API Reference

Base URL: `http://127.0.0.1:8000`

## Health

- `GET /health`  
  App-level health check.

- `GET /scores/health`  
  Scores router health check.

## Findings

- `GET /scores/`  
  Returns all findings (no pagination).

- `GET /scores/top10`  
  Top 10 findings by `risk_score` descending.

- `GET /scores/summary`  
  Overall counts and risk-band breakdown, including KEV subtotals.

- `GET /scores/all`  
  Paginated findings list.
  Query params:
  - `page` (default `1`)
  - `page_size` (default `50`, max `200`)
  - `sort_by` (`risk_score|cvss_score|epss_score|vuln_age_days|source`)
  - `sort_order` (`asc|desc`)
  - `source` (optional exact source filter)

- `GET /scores/band/{risk_band}`  
  Paginated findings for one band (`Critical|High|Medium|Low`).
  Supports the same query params as `/scores/all`.

- `GET /scores/findings/{finding_db_id}`  
  Fetch one finding by DB id.

## Source Management

- `GET /scores/sources`  
  Source-level summary with risk-band counts.

- `PATCH /scores/sources/{source_name}`  
  Rename a source.
  Body:
  ```json
  { "new_source": "New Name" }
  ```

- `DELETE /scores/sources/{source_name}`  
  Delete all findings for a source.

## Risk Weights

- `GET /scores/weights`  
  Returns current scoring weights.

- `PUT /scores/weights`  
  Updates scoring weights and re-scores all findings.
  Body:
  ```json
  {
    "cvss_weight": 0.40,
    "epss_weight": 0.25,
    "kev_weight": 0.25,
    "asset_criticality_weight": 0.15,
    "context_weight": 0.20
  }
  ```

## Disposition Workflow

- `POST /scores/findings/{finding_db_id}/disposition`  
  Set finding disposition (`ignored|risk_accepted|false_positive|not_applicable`).
  Body:
  ```json
  {
    "disposition": "false_positive",
    "reason": "Scanner false hit",
    "comment": "Validated manually",
    "expires_at": null,
    "actor": "ui"
  }
  ```

- `POST /scores/findings/{finding_db_id}/disposition/clear`  
  Clears disposition back to `none`.
  Query param:
  - `actor` (optional)

## Data Ingestion / Enrichment

- `POST /scores/seed/qualys-csv`  
  Multipart CSV upload for bulk inserts using the staged finding dataset.
  Form fields:
  - `source` (string)
  - `file` (CSV file)

- `POST /scores/kev/re-enrich`  
  Reprocesses all findings against a KEV CSV.
  Body:
  ```json
  { "csv_path": "/absolute/or/relative/path/to/kev.csv" }
  ```
