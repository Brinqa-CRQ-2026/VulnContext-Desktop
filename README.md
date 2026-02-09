# VulnContext Desktop

VulnContext Desktop is a local vulnerability risk scoring and analysis application with a **FastAPI backend** and a **desktop-style React/Electron UI**. It ingests Qualys-like vulnerability data, applies a **context-aware risk scoring model**, and presents ranked findings with rich drill-down detail.

This project is designed to mirror real-world vulnerability management workflows (Qualys / VMDR style) while remaining lightweight and fully local.

---

## Features

- Context-aware vulnerability risk scoring (CVSS + EPSS + asset context)
- Ranked vulnerability list (highest risk first)
- Right-side drawer with **full vulnerability & asset details**
- Pagination for large datasets (1,500+ findings)
- Risk band filtering (Critical / High / Medium / Low)
- Aggregate metrics & risk distribution summary
- SQLite persistence (auto-created)
- FastAPI REST API
- React + shadcn/ui frontend
- Docker-ready backend

---

## Risk Scoring Model

Each vulnerability is scored using a weighted, normalized model inspired by industry practices:

- CVSS (severity)
- EPSS (likelihood of exploitation)
- Internet exposure
- Asset criticality
- Vulnerability age
- Authentication requirements (penalty)

Scores are normalized, weighted, and mapped into risk bands:

- **Critical**
- **High**
- **Medium**
- **Low**

The model is designed to be explainable and extensible.

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm
- Docker (optional)

---

### Install Dependencies

#### Backend
```bash
cd backend
python3 -m pip install -r requirements.txt
```

#### Frontend
```bash
cd frontend
npm install
```

---

### Run Locally

#### Backend (Terminal 1)
```bash
cd backend
python3 -m uvicorn app.main:app --reload --port 8000
```

#### Seed Database (first run)
```bash
cd backend
python3 -m app.seed
```

#### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

Frontend will connect to `http://localhost:8000`.

---

### Optional: Docker (Backend)

```bash
docker-compose up -d
```

---

## Project Structure

```
VulnContext-Desktop/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app entry point
│   │   ├── api/
│   │   │   └── scores.py          # Risk score & pagination endpoints
│   │   ├── core/
│   │   │   └── db.py              # Database session / engine
│   │   ├── models.py              # SQLAlchemy models
│   │   ├── schemas.py             # Pydantic response schemas
│   │   ├── scoring.py             # Context-aware scoring logic
│   │   └── seed.py                # CSV → DB ingestion
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── api.ts                 # API client + types
│   │   ├── App.tsx                # App composition
│   │   ├── hooks/
│   │   │   └── useScoresData.ts   # Data-fetching hooks
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── Header.tsx
│   │   │   └── dashboard/
│   │   │       ├── SummaryCards.tsx
│   │   │       ├── RiskTable.tsx
│   │   │       └── VulnerabilityDrawer.tsx
│   │   └── components/ui/         # shadcn/ui components
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── data/
│   └── vulncontext.db             # SQLite database (auto-created)
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## API Endpoints

### Health
```
GET /health
```

### Summary Metrics
```
GET /scores/summary
```

### Top 10 by Risk
```
GET /scores/top10
```

### All Findings (Paginated)
```
GET /scores/all?page=1&page_size=50
```

Responses are sorted by `risk_score DESC`.

---

## Frontend Views

### Dashboard
- Total findings
- Risk distribution
- Ranked vulnerability table
- Risk band filters

### Vulnerability Drill-Down
Click any row to open a **right-side drawer** showing:

- CVE / CWE
- Description
- CVSS & EPSS
- Attack vector & exploit context
- Asset details (hostname, IP, OS, type)
- Exposure (port, service, internet exposed)
- Detection history
- Risk score & band

---

## Testing

### Backend
```bash
curl http://localhost:8000/health
curl http://localhost:8000/scores/top10
curl http://localhost:8000/scores/all?page=1&page_size=10
```

### Frontend
```bash
cd frontend
npm run build
```

---

## Troubleshooting

### Backend not reachable
- Confirm FastAPI is running on port 8000
- Check `/health`
- Ensure port is free: `lsof -i :8000`

### Database issues
- SQLite DB is at `data/vulncontext.db`
- Reset by deleting the file and re-running seed:
```bash
rm data/vulncontext.db
python3 -m app.seed
```

### Frontend errors
- Ensure backend is running
- Check browser DevTools console
- Verify API base URL in `src/api.ts`

### Pagination / UI errors
- Ensure shadcn pagination is installed:
```bash
npx shadcn@latest add pagination
```

---

## Technologies

- **Backend**: FastAPI, SQLAlchemy, SQLite
- **Frontend**: React, TypeScript, shadcn/ui, Radix UI
- **State & Data**: Custom hooks
- **Infra**: Docker (optional)

---

## Future Enhancements

- CSV upload (Qualys-style integration)
- Editable scoring weights per organization
- Findings search & advanced filters
- Auth & multi-tenant support
- Charts & trend analysis
- Export & reporting