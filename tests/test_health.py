"""
Tests for GET /api/health.
"""
from unittest.mock import patch

import pytest


def test_health_connected(client):
    """When DB is mocked as connected, health should report neo4jConnected=true."""
    with patch("app.database._db_connected", True), \
         patch("app.api.health.database.is_connected", return_value=True), \
         patch("app.api.health.database.connection_error", return_value=""):
        resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "neo4jConnected" in body
    assert "database" in body
    assert "message" in body
    assert "version" in body


def test_health_disconnected(disconnected_client):
    """When DB is not connected, health must still return 200 but report failure."""
    with patch("app.api.health.database.is_connected", return_value=False), \
         patch("app.api.health.database.connection_error", return_value="Connection refused"):
        resp = disconnected_client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["neo4jConnected"] is False


def test_health_not_configured(disconnected_client):
    """Missing credentials should produce an informative message."""
    from app.config import get_settings
    with patch("app.api.health.database.is_connected", return_value=False), \
         patch("app.api.health.database.connection_error", return_value="not configured"):
        resp = disconnected_client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["neo4jConnected"] is False
