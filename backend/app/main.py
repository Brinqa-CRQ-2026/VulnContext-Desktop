from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.db import Base, engine
from app.api import scores as scores_router

# Create tables on startup (simple academic prototype)
Base.metadata.create_all(bind=engine)

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