"""
pytest fixtures shared across the test suite.
All tests use synthetic data — no real patient records, no live credentials.
Neo4j sessions are mocked in unit tests.
"""
from __future__ import annotations

import io
import os
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

# Ensure test .env values never override a real .env
os.environ.setdefault("NEO4J_URI", "")
os.environ.setdefault("NEO4J_USERNAME", "neo4j")
os.environ.setdefault("NEO4J_PASSWORD", "")
os.environ.setdefault("NEO4J_DATABASE", "neo4j")
os.environ.setdefault("FRONTEND_ORIGINS", "http://localhost:5173")
os.environ.setdefault("UPLOAD_DIR", "test_uploads")

from app.main import app


# ---------------------------------------------------------------------------
# Synthetic data
# ---------------------------------------------------------------------------

SYNTHETIC_CSV = b"""patientId,ageGroup,condition
P001,30-40,Asthma
P002,40-50,Diabetes
P003,20-30,Hypertension
"""

SYNTHETIC_CSV_DUPE = b"""patientId,ageGroup,condition
P001,30-40,Asthma
P001,30-40,Asthma
P004,50-60,Arthritis
"""

SYNTHETIC_CSV_INVALID = b"""ageGroup,condition
30-40,Asthma
"""

SYNTHETIC_JSON_ARRAY = b"""[
  {"patientId": "P010", "ageGroup": "30-40", "condition": "Asthma"},
  {"patientId": "P011", "ageGroup": "50-60", "condition": "COPD"}
]"""

SYNTHETIC_JSON_WRAPPED = b"""{"patients": [
  {"patientId": "P020", "ageGroup": "20-30"},
  {"patientId": "P021", "ageGroup": "40-50"}
]}"""

SYNTHETIC_JSON_INVALID = b"""not valid json at all {{{"""

SYNTHETIC_FHIR_BUNDLE = b"""{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "fhir-001",
        "name": [{"given": ["Jane"], "family": "Doe"}],
        "gender": "female",
        "birthDate": "1985-06-15"
      }
    }
  ]
}"""


# ---------------------------------------------------------------------------
# Mocked Neo4j session fixture
# ---------------------------------------------------------------------------

def _make_async_result(records: list) -> AsyncMock:
    """Return a mock that looks like a Neo4j AsyncResult."""
    result = AsyncMock()
    result.__aiter__ = AsyncMock(return_value=iter(records))
    result.single = AsyncMock(return_value=records[0] if records else None)
    return result


@pytest.fixture
def mock_session():
    """A mock AsyncSession that returns empty results by default."""
    session = AsyncMock()
    empty_result = AsyncMock()
    empty_result.__aiter__ = MagicMock(return_value=iter([]))
    empty_result.single = AsyncMock(return_value=None)
    session.run = AsyncMock(return_value=empty_result)
    return session


# ---------------------------------------------------------------------------
# HTTP test clients
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """Synchronous test client — DB driver is patched to appear connected."""
    with patch("app.database._db_connected", True), \
         patch("app.database._driver", MagicMock()):
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


@pytest_asyncio.fixture
async def async_client():
    """Async test client for testing async routes."""
    with patch("app.database._db_connected", True), \
         patch("app.database._driver", MagicMock()):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as c:
            yield c


@pytest.fixture
def disconnected_client():
    """Client where Neo4j is NOT connected — tests error responses."""
    with patch("app.database._db_connected", False), \
         patch("app.database._driver", None), \
         patch("app.database._db_error", "Connection refused in test"):
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c
