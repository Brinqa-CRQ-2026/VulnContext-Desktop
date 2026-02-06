# Backend - app/api/ (API Routes)

This folder contains the REST API endpoints.

## Files to Create

- [ ] **scores.py** - Vulnerability scoring endpoints
  - `GET /scores` - Retrieve all stored scores from database
  - `POST /scores` - Create new vulnerability score and compute risk
  
## Tasks

1. Create router with `/scores` prefix
2. Implement `GET /scores` endpoint
   - Query database for all ScoreRecord entries
   - Return list of scores
3. Implement `POST /scores` endpoint
   - Accept ScoreCreate schema from request body
   - Call `compute_risk_score()` from scoring module
   - Save to database via SQLAlchemy
   - Return created score with computed risk score

## Dependencies

- FastAPI router
- SQLAlchemy session (from `app.core.db`)
- Pydantic schemas (from `app.core.schemas`)
- Scoring logic (from `app.core.scoring`)

## Example Request/Response

### POST /scores
```json
Request:
{
  "vulnerability_name": "CVE-2024-001",
  "severity": "high",
  "notes": "Found in production"
}

Response:
{
  "id": 1,
  "vulnerability_name": "CVE-2024-001",
  "severity": "high",
  "risk_score": 0.75,
  "notes": "Found in production",
  "created_at": "2024-02-06T10:30:00",
  "updated_at": "2024-02-06T10:30:00"
}
```
