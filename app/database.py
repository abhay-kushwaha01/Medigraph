"""
Neo4j Aura database driver — lifecycle management and query helpers.

Responsibilities:
  - Create and tear down the driver on FastAPI startup/shutdown.
  - Expose a dependency (get_db) for injecting sessions into routes.
  - Run verify_connectivity() so the app knows early whether the DB is reachable.
  - Initialize schema constraints without touching existing data.
  - Never log or return credentials.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from neo4j import AsyncGraphDatabase, AsyncDriver, exceptions as neo4j_exc

from app.config import get_settings

logger = logging.getLogger(__name__)

# Module-level driver — set during startup, torn down on shutdown
_driver: Optional[AsyncDriver] = None
_db_connected: bool = False
_db_error: str = ""


# ---------------------------------------------------------------------------
# Driver lifecycle
# ---------------------------------------------------------------------------

async def init_driver() -> None:
    """Create the Neo4j async driver and verify connectivity."""
    global _driver, _db_connected, _db_error
    settings = get_settings()

    if not settings.is_neo4j_configured():
        _db_connected = False
        _db_error = (
            "Neo4j credentials not configured. "
            "Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD in your .env file."
        )
        logger.warning(_db_error)
        return

    try:
        _driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password),
            database=settings.neo4j_database,
            max_connection_pool_size=50,
        )
        await _driver.verify_connectivity()
        _db_connected = True
        _db_error = ""
        logger.info("Neo4j driver connected — database: %s", settings.neo4j_database)
        await _init_schema()
    except neo4j_exc.AuthError as exc:
        _db_connected = False
        _db_error = "Neo4j authentication failed. Check NEO4J_USERNAME and NEO4J_PASSWORD."
        logger.error("Neo4j auth error: %s", exc)
    except neo4j_exc.ServiceUnavailable as exc:
        _db_connected = False
        _db_error = "Neo4j service unavailable. Check NEO4J_URI and network connectivity."
        logger.error("Neo4j unavailable: %s", exc)
    except Exception as exc:  # noqa: BLE001
        _db_connected = False
        _db_error = f"Neo4j connection error: {type(exc).__name__}"
        logger.error("Unexpected Neo4j error: %s", exc)


async def close_driver() -> None:
    """Gracefully close the driver during application shutdown."""
    global _driver, _db_connected
    if _driver:
        await _driver.close()
        _driver = None
        _db_connected = False
        logger.info("Neo4j driver closed.")


def is_connected() -> bool:
    return _db_connected


def connection_error() -> str:
    return _db_error


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

async def get_db() -> AsyncGenerator:
    """
    FastAPI dependency — yields an async Neo4j session.
    Raises RuntimeError when the driver is not initialised.
    """
    if _driver is None:
        raise RuntimeError("Neo4j driver is not initialised. Check your .env configuration.")
    settings = get_settings()
    async with _driver.session(database=settings.neo4j_database) as session:
        yield session


# ---------------------------------------------------------------------------
# Schema initialisation  (safe — never drops existing data)
# ---------------------------------------------------------------------------

_CONSTRAINTS = [
    # Each label gets a uniqueness constraint on its stable ID property
    "CREATE CONSTRAINT patient_id IF NOT EXISTS FOR (n:Patient) REQUIRE n.patientId IS UNIQUE",
    "CREATE CONSTRAINT condition_code IF NOT EXISTS FOR (n:Condition) REQUIRE n.code IS UNIQUE",
    "CREATE CONSTRAINT medicine_code IF NOT EXISTS FOR (n:Medicine) REQUIRE n.code IS UNIQUE",
    "CREATE CONSTRAINT ingredient_id IF NOT EXISTS FOR (n:Ingredient) REQUIRE n.ingredientId IS UNIQUE",
    "CREATE CONSTRAINT allergy_id IF NOT EXISTS FOR (n:Allergy) REQUIRE n.allergyId IS UNIQUE",
    "CREATE CONSTRAINT encounter_id IF NOT EXISTS FOR (n:Encounter) REQUIRE n.encounterId IS UNIQUE",
    "CREATE CONSTRAINT observation_id IF NOT EXISTS FOR (n:Observation) REQUIRE n.observationId IS UNIQUE",
    "CREATE CONSTRAINT organization_id IF NOT EXISTS FOR (n:Organization) REQUIRE n.organizationId IS UNIQUE",
    "CREATE CONSTRAINT source_id IF NOT EXISTS FOR (n:Source) REQUIRE n.sourceId IS UNIQUE",
]


async def _init_schema() -> None:
    """Apply uniqueness constraints. Safe to run on a non-empty database."""
    if _driver is None:
        return
    settings = get_settings()
    async with _driver.session(database=settings.neo4j_database) as session:
        for cypher in _CONSTRAINTS:
            try:
                await session.run(cypher)
            except Exception as exc:  # noqa: BLE001
                # Non-fatal — constraint may already exist under a different name
                logger.debug("Constraint statement skipped (%s): %s", type(exc).__name__, cypher)
    logger.info("Neo4j schema constraints verified.")


# ---------------------------------------------------------------------------
# Convenience query helpers
# ---------------------------------------------------------------------------

async def run_query(cypher: str, parameters: dict | None = None) -> list[dict]:
    """
    Execute a read or write query outside of a request context.
    Returns a list of record dicts.  Raises if the driver is not ready.
    """
    if _driver is None:
        raise RuntimeError("Neo4j driver not initialised.")
    settings = get_settings()
    async with _driver.session(database=settings.neo4j_database) as session:
        result = await session.run(cypher, parameters or {})
        return [dict(record) async for record in result]
