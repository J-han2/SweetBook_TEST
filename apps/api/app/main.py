from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import ai, book_drafts, dream_entries, orders, tags
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.services.media import ensure_storage_dirs
from app.services.seeder import seed_database

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_storage_dirs()

    with SessionLocal() as session:
        seed_database(session)

    if not Path(settings.llm_model_path).exists():
        logger.warning("Local sLLM model not found at %s", settings.llm_model_path)

    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory=settings.storage_root), name="media")

app.include_router(dream_entries.router, prefix=settings.api_prefix)
app.include_router(tags.router, prefix=settings.api_prefix)
app.include_router(ai.router, prefix=settings.api_prefix)
app.include_router(book_drafts.router, prefix=settings.api_prefix)
app.include_router(orders.router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "DreamArchive API", "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
