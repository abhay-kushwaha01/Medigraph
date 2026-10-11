"""
GET /api/health — real API and database status.
Never claims the database is connected without actually checking.
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app import database
from app.config import get_settings

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    neo4j_connected: bool = Field(..., alias="neo4jConnected")
    database: str
    message: str
    version: str

    model_config = {"populate_by_name": True}


@router.get(
    "/health",
    response_model=HealthResponse,
    response_model_by_alias=True,
    summary="API and database health check",
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    """
    Returns the real-time status of the API and its Neo4j Aura connection.

    The API may be running while the database is unreachable.
    `neo4jConnected` reflects the actual connection state, not an assumption.
    """
    settings = get_settings()
    connected = database.is_connected()
    err = database.connection_error()

    if connected:
        msg = f"API running. Neo4j connected to database '{settings.neo4j_database}'."
    elif not settings.is_neo4j_configured():
        msg = (
            "API running. Neo4j is NOT configured — set NEO4J_URI, "
            "NEO4J_USERNAME, and NEO4J_PASSWORD in your .env file."
        )
    else:
        msg = f"API running. Neo4j connection FAILED: {err}"

    return HealthResponse(
        status="ok",
        neo4j_connected=connected,
        database=settings.neo4j_database,
        message=msg,
        version=settings.app_version,
    )
