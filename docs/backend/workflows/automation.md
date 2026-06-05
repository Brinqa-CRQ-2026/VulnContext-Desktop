# GitHub Actions Workflows

## Summary

These scripts are owned by GitHub Actions and should be thought of as scheduled pipeline jobs, not operator entrypoints.

## Workflow Map

| Workflow | Script | Purpose |
| --- | --- | --- |
| `sync_daily.yml` | `backend/scripts/automation/sync_daily.py` | refresh EPSS, refresh KEV, then update the KEV flag in the database |
| `sync_nvd.yml` | `backend/scripts/automation/sync_nvd.py` | refresh CVSS data from NVD |

## Supporting Scripts

- `backend/scripts/automation/sync_epss.py`
- `backend/scripts/automation/sync_kev.py`
- `backend/scripts/automation/sync_nvd.py`
- `backend/scripts/automation/sync_daily.py`

