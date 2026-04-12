from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.api import ROUTERS
from app.core.db import Base, engine, ensure_database_schema
from app.core.env import load_backend_env
from app.epss import get_epss_scores

load_backend_env()

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"
FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR / "index.html"

# Create tables on startup (simple academic prototype)
Base.metadata.create_all(bind=engine)
ensure_database_schema()

app = FastAPI(
    title="VulnContext Backend",
    description="Local FastAPI backend for VulnContext Desktop",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# --- CORS SETUP ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
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


@app.on_event("startup")
def startup_event():
    try:
        get_epss_scores()
    except Exception as exc:
        # Keep local dev/tests usable when offline; EPSS can be refreshed later.
        print(f"[startup] EPSS refresh skipped: {exc}")


# Register routers
for router in ROUTERS:
    app.include_router(router)


if FRONTEND_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR), name="frontend-assets")


def serve_frontend_app():
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)

    return HTMLResponse(
        """
        <html>
          <body>
            <h1>Frontend build not found</h1>
            <p>Run <code>npm run build</code> in <code>frontend/</code> so FastAPI can serve the app.</p>
          </body>
        </html>
        """,
        status_code=503,
    )


@app.get("/", include_in_schema=False)
def frontend_index():
    return serve_frontend_app()


@app.get("/business-services", include_in_schema=False)
@app.get("/business-services/{service_slug:path}", include_in_schema=False)
def frontend_business_services(service_slug: str | None = None):
    return serve_frontend_app()
