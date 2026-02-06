# Backend - app/core/ (Database & Logic)

This folder contains database models, schemas, and business logic.

## Files to Create

- [ ] **db.py** - Database initialization
  - SQLite connection string
  - SessionLocal for database sessions
  - Base class for models
  - `get_db()` dependency function
  - `init_db()` to create tables

- [ ] **models.py** - SQLAlchemy ORM models
  - `ScoreRecord` model with columns:
    - id (Integer, primary key)
    - vulnerability_name (String)
    - severity (String)
    - risk_score (Float)
    - notes (String, optional)
    - created_at (DateTime)
    - updated_at (DateTime)

- [ ] **schemas.py** - Pydantic request/response schemas
  - `ScoreBase` - Common fields
  - `ScoreCreate` - For POST requests
  - `ScoreResponse` - For responses

- [ ] **scoring.py** - Risk scoring logic
  - `compute_risk_score(vulnerability_name, severity, notes)` function
  - Returns float 0.0-1.0
  - Severity mapping: critical=0.95, high=0.75, medium=0.50, low=0.25

## Tasks

1. Create database connection in `db.py`
2. Define ScoreRecord model in `models.py`
3. Create Pydantic schemas in `schemas.py`
4. Implement scoring logic in `scoring.py`
5. Test database initialization

## Database Location

SQLite file: `./data/vuln_context.db`
