# VulnContext Desktop

Local vulnerability risk scoring application with Electron UI and FastAPI backend.

## Quick Start

### Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### Run

**Backend (Terminal 1):**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm run build
npm start
```

Or use Docker:
```bash
docker-compose up -d
cd frontend && npm install && npm run build && npm start
```

## Project Structure

```
VulnContext-Desktop/
├── backend/
│   ├── app/
│   │   ├── main.py              # TODO: FastAPI app entry point
│   │   ├── api/
│   │   │   ├── scores.py        # TODO: GET/POST endpoints
│   │   │   └── README.md        # Task details
│   │   └── core/
│   │       ├── db.py            # TODO: Database connection
│   │       ├── models.py         # TODO: SQLAlchemy models
│   │       ├── schemas.py        # TODO: Pydantic schemas
│   │       ├── scoring.py        # TODO: Risk scoring logic
│   │       └── README.md         # Task details
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── index.html           # ✅ HTML form (created)
│   │   ├── api.ts              # TODO: API client
│   │   ├── renderer.ts         # TODO: Event handlers
│   │   ├── styles.css          # TODO: Styling
│   │   └── README.md           # Task details
│   ├── electron-main.ts        # ✅ Window management (created)
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── docker/
│   ├── backend.Dockerfile      # ✅ Created
│   └── README.md
│
├── data/                        # SQLite database (auto-created)
├── docker-compose.yml          # ✅ Created
├── .gitignore                  # ✅ Created
└── README.md
```

## What to Build

### Backend (Python/FastAPI)
- [ ] `backend/app/main.py` - FastAPI application entry point
- [ ] `backend/app/core/db.py` - Database setup
- [ ] `backend/app/core/models.py` - SQLAlchemy models
- [ ] `backend/app/core/schemas.py` - Pydantic schemas
- [ ] `backend/app/core/scoring.py` - Risk scoring logic
- [ ] `backend/app/api/scores.py` - GET/POST endpoints

**See:** `backend/app/api/README.md` and `backend/app/core/README.md`

### Frontend (TypeScript/Electron)
- [ ] `frontend/src/api.ts` - API client
- [ ] `frontend/src/renderer.ts` - Event handlers
- [ ] `frontend/src/styles.css` - Styling

**See:** `frontend/src/README.md`

## API Endpoints to Implement

- `GET /health` - Health check
- `GET /scores` - Retrieve all scores
- `POST /scores` - Create new score

## Technologies

- **Backend**: Python 3.9+, FastAPI, SQLAlchemy, SQLite
- **Frontend**: Node 16+, Electron, TypeScript
- **Docker**: Python 3.12-slim base

## Development Workflow

```bash
# Terminal 1: Backend with auto-reload
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend with TypeScript watch
cd frontend
npm run watch

# Terminal 3: Run Electron app
cd frontend
npm start
```

## Next Steps

1. Read task READMEs in each folder
2. Implement backend components (core/ then api/)
3. Implement frontend components (src/)
4. Test with sample data
5. Deploy with Docker Compose

---

**Component README files have detailed tasks and examples.**
- [ ] Implement comprehensive error logging

## Dependencies

### Backend
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `sqlalchemy` - ORM
- `pydantic` - Data validation

### Frontend
- `electron` - Desktop framework
- `typescript` - Type safety

## Testing

```bash
# Backend tests (pytest - to be implemented)
cd backend
pip install pytest
pytest

# Frontend build check
cd frontend
npm run build

# Manual API testing
curl http://localhost:8000/health
curl http://localhost:8000/scores
curl -X POST http://localhost:8000/scores \
  -H "Content-Type: application/json" \
  -d '{"vulnerability_name":"CVE-2023-001","severity":"high"}'
```

## Troubleshooting

### Backend won't connect
- Ensure the API is running on `http://localhost:8000`
- Check the health endpoint: `curl http://localhost:8000/health`
- Review [app/main.py](backend/app/main.py) CORS settings
- Check that port 8000 is not in use: `lsof -i :8000` (macOS)

### Frontend can't reach backend
- Check browser console for fetch errors (press F12 in Electron app)
- Ensure backend is running before starting frontend
- Verify API response in Network tab of DevTools
- Check [frontend/src/api.ts](frontend/src/api.ts) for correct API_BASE_URL

### Database issues
- SQLite database is created at `./data/vuln_context.db`
- Ensure `data/` directory exists and is writable
- Delete database file to reset: `rm data/vuln_context.db`
- Database is automatically initialized on first API call

### TypeScript compilation errors
- Run `npm run build` in frontend/ to check for compilation errors
- Ensure all types are properly defined in tsconfig.json
- Install missing types: `npm install --save-dev @types/node`

### Electron app won't start
- Ensure all npm dependencies are installed: `npm install`
- Check that TypeScript is compiled: `npm run build`
- Verify electron-main.ts path is correct in package.json
- Check DevTools console for errors: `mainWindow.webContents.openDevTools()`
- Ensure backend is running before starting the Electron app
- Verify API_BASE_URL in `frontend/src/api.ts`

### Database errors
- Check that `./data` directory exists and is writable
- Delete `./data/vuln_context.db` to reset the database
- Ensure SQLite3 is installed (usually included with Python)

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Commit with clear messages: `git commit -m "Add feature X"`
4. Push and create a Pull Request

## License

MIT License - See LICENSE file for details

## Contact

For questions or contributions, please open an issue or contact the team.
