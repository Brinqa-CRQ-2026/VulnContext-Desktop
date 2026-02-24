from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.db import Base, engine, ensure_database_schema
from app.api import scores as scores_router

# Create tables on startup (simple academic prototype)
Base.metadata.create_all(bind=engine)
ensure_database_schema()

app = FastAPI(
    title="VulnContext Backend",
    description="Local FastAPI backend for VulnContext Desktop",
    version="0.1.0",
)

# --- CORS SETUP ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # add other origins if needed, e.g. prod Electron URL later
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- END CORS SETUP ---


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


# Register routers
app.include_router(scores_router.router)

from app.epss import get_epss_scores 
@app.on_event("startup")
def startup_event():
    try:
        get_epss_scores()
    except Exception as exc:
        # Keep local dev/tests usable when offline; EPSS can be refreshed later.
        print(f"[startup] EPSS refresh skipped: {exc}")
