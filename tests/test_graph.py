"""
Tests for GET /api/graph.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def test_graph_db_disconnected(disconnected_client):
    """Returns 503 when Neo4j is unavailable."""
    resp = disconnected_client.get("/api/graph")
    assert resp.status_code == 503


def test_graph_empty_db(client):
    """Empty database returns valid schema with empty arrays."""
    empty_result = AsyncMock()
    empty_result.__aiter__ = MagicMock(return_value=iter([]))
    empty_result.single = AsyncMock(return_value={"total": 0})

    mock_sess = AsyncMock()
    mock_sess.run = AsyncMock(return_value=empty_result)
    mock_sess.__aenter__ = AsyncMock(return_value=mock_sess)
    mock_sess.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.graph.database.is_connected", return_value=True), \
         patch("app.api.graph.get_db", return_value=mock_sess):
        resp = client.get("/api/graph")

    assert resp.status_code == 200
    body = resp.json()
    assert "graphNodes" in body
    assert "graphRelationships" in body
    assert "totalNodes" in body
    assert "totalRelationships" in body
    assert "isTruncated" in body
    assert isinstance(body["graphNodes"], list)
    assert isinstance(body["graphRelationships"], list)


def test_graph_response_schema(client):
    """Response must include all required camelCase fields."""
    empty_result = AsyncMock()
    empty_result.__aiter__ = MagicMock(return_value=iter([]))
    empty_result.single = AsyncMock(return_value={"total": 0})

    mock_sess = AsyncMock()
    mock_sess.run = AsyncMock(return_value=empty_result)

    with patch("app.api.graph.database.is_connected", return_value=True), \
         patch("app.api.graph.get_db", return_value=mock_sess):
        resp = client.get("/api/graph")

    assert resp.status_code == 200
    body = resp.json()
    required_keys = {"graphNodes", "graphRelationships", "totalNodes", "totalRelationships", "isTruncated"}
    assert required_keys.issubset(body.keys())
