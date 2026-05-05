from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.api import ROUTERS
from app.core.env import load_backend_env

load_backend_env()

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"
FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR / "index.html"

app = FastAPI(
    title="VulnContext Backend",
    description="Supabase-first FastAPI backend for VulnContext Desktop",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

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


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


@app.get("/api/v1/health", include_in_schema=False)
def health_v1():
    return health()


for router in ROUTERS:
    app.include_router(router, prefix="/api/v1")

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
@app.get("/business-units", include_in_schema=False)
@app.get("/business-units/{service_slug:path}", include_in_schema=False)
def frontend_business_services(service_slug: str | None = None):
    return serve_frontend_app()
