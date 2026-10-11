"""
Tests for POST /api/patient-analysis.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


VALID_REQUEST = {
    "patientId": "P001",
    "ageGroup": "30-40",
    "conditions": ["Asthma"],
    "allergies": ["Example Ingredient A"],
    "currentMedications": ["Example Medicine B"],
}


def test_analysis_db_disconnected(disconnected_client):
    resp = disconnected_client.post("/api/patient-analysis", json=VALID_REQUEST)
    assert resp.status_code == 503


def test_analysis_missing_patient_id(client):
    """patientId is required."""
    with patch("app.api.analysis.database.is_connected", return_value=True):
        resp = client.post("/api/patient-analysis", json={
            "ageGroup": "30-40",
            "conditions": [],
            "allergies": [],
            "currentMedications": [],
        })
    assert resp.status_code == 422


def test_analysis_response_schema(client):
    """Response must have all required top-level camelCase fields."""
    empty_result = AsyncMock()
    empty_result.__aiter__ = MagicMock(return_value=iter([]))
    empty_result.single = AsyncMock(return_value=None)

    mock_sess = AsyncMock()
    mock_sess.run = AsyncMock(return_value=empty_result)

    with patch("app.api.analysis.database.is_connected", return_value=True), \
         patch("app.api.analysis.get_db", return_value=mock_sess):
        resp = client.post("/api/patient-analysis", json=VALID_REQUEST)

    assert resp.status_code == 200
    body = resp.json()
    required = {"patientId", "findings", "graphNodes", "graphRelationships", "sources", "limitations"}
    assert required.issubset(body.keys()), f"Missing keys: {required - body.keys()}"
    assert body["patientId"] == "P001"
    assert isinstance(body["findings"], list)
    assert isinstance(body["graphNodes"], list)
    assert isinstance(body["graphRelationships"], list)
    assert isinstance(body["sources"], list)
    assert isinstance(body["limitations"], list)
    # Limitations must always include the medical disclaimer
    assert len(body["limitations"]) > 0


def test_analysis_empty_medication_list(client):
    """Single medication — no drug-drug interaction check needed."""
    empty_result = AsyncMock()
    empty_result.__aiter__ = MagicMock(return_value=iter([]))
    empty_result.single = AsyncMock(return_value=None)

    mock_sess = AsyncMock()
    mock_sess.run = AsyncMock(return_value=empty_result)

    payload = {
        "patientId": "P001",
        "conditions": [],
        "allergies": [],
        "currentMedications": ["Aspirin"],
    }
    with patch("app.api.analysis.database.is_connected", return_value=True), \
         patch("app.api.analysis.get_db", return_value=mock_sess):
        resp = client.post("/api/patient-analysis", json=payload)

    assert resp.status_code == 200
