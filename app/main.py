"""
MediGraph AI — FastAPI application entry point.

Architecture: React/TypeScript frontend → FastAPI → Neo4j Aura
The browser never connects to Neo4j directly.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import database
from app.api import analysis, graph, health, imports, patients
from app.config import get_settings

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan  (startup + shutdown)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise and tear down the Neo4j driver."""
    settings = get_settings()
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)
    await database.init_driver()
    yield
    await database.close_driver()
    logger.info("%s shutdown complete.", settings.app_name)


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

settings = get_settings()

app = FastAPI(
    title="MediGraph AI",
    description=(
        "Personalized Medical Knowledge Graph API.\n\n"
        "**Architecture:** React + TypeScript → FastAPI → Neo4j Aura\n\n"
        "**Important:** This API provides medical information support only. "
        "It does not provide diagnosis, prescribing, or treatment recommendations."
    ),
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS  (allow the React dev server and any configured origins)
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

app.include_router(health.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(imports.router, prefix="/api")


# ---------------------------------------------------------------------------
# Root redirect
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse(
        {
            "name": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/api/health",
        }
    )


# ---------------------------------------------------------------------------
# Global exception handler  (never leak internal details)
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.error("Unhandled exception on %s: %s", request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Check server logs."},
    )
