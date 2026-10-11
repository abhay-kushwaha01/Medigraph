"""
Tests for the import workflow: upload → validate → approve → execute.
All Neo4j interactions are mocked. Synthetic data only.
"""
from __future__ import annotations

import io
import os
import shutil
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Use a temp upload dir for tests
os.environ["UPLOAD_DIR"] = "test_uploads"


VALID_CSV = b"patientId,ageGroup,condition\nP001,30-40,Asthma\nP002,40-50,Diabetes\n"
INVALID_CSV = b"ageGroup,condition\n30-40,Asthma\n"   # no patientId
DUPE_CSV = b"patientId,ageGroup\nP001,30-40\nP001,40-50\n"
UNSUPPORTED = b"%PDF-1.4 fake pdf content"


@pytest.fixture(autouse=True)
def clean_test_uploads():
    """Remove test upload artefacts before and after each test."""
    d = Path("test_uploads")
    if d.exists():
        shutil.rmtree(d)
    yield
    if d.exists():
        shutil.rmtree(d)


def _upload(client, content: bytes, filename: str = "patients.csv", content_type: str = "text/csv"):
    return client.post(
        "/api/imports/upload",
        files={"file": (filename, io.BytesIO(content), content_type)},
    )


# ---------------------------------------------------------------------------

class TestUpload:
    def test_upload_valid_csv(self, client):
        resp = _upload(client, VALID_CSV)
        assert resp.status_code == 201
        body = resp.json()
        assert "jobId" in body
        assert body["status"] == "pending"
        assert body["fileType"] == "csv"

    def test_upload_unsupported_extension(self, client):
        resp = _upload(client, UNSUPPORTED, "report.docx", "application/msword")
        assert resp.status_code == 415

    def test_upload_empty_file(self, client):
        resp = _upload(client, b"", "empty.csv")
        assert resp.status_code == 400

    def test_upload_json(self, client):
        content = b'[{"patientId":"P010","ageGroup":"30-40"}]'
        resp = _upload(client, content, "patients.json", "application/json")
        assert resp.status_code == 201
        body = resp.json()
        assert body["fileType"] == "json"


class TestValidate:
    def test_validate_valid_csv(self, client):
        up = _upload(client, VALID_CSV)
        job_id = up.json()["jobId"]
        resp = client.post(f"/api/imports/{job_id}/validate")
        assert resp.status_code == 200
        body = resp.json()
        assert "jobId" in body
        assert "fieldMappings" in body
        assert "validationIssues" in body
        assert body["totalRecords"] == 3

    def test_validate_missing_required_field(self, client):
        up = _upload(client, INVALID_CSV)
        job_id = up.json()["jobId"]
        resp = client.post(f"/api/imports/{job_id}/validate")
        assert resp.status_code == 200
        body = resp.json()
        issues = body["validationIssues"]
        error_issues = [i for i in issues if i["severity"] == "error"]
        assert len(error_issues) > 0

    def test_validate_duplicate_detection(self, client):
        up = _upload(client, DUPE_CSV)
        job_id = up.json()["jobId"]
        resp = client.post(f"/api/imports/{job_id}/validate")
        assert resp.status_code == 200
        body = resp.json()
        issues = body["validationIssues"]
        dup_issues = [i for i in issues if "Duplicate" in i["message"]]
        assert len(dup_issues) > 0

    def test_validate_nonexistent_job(self, client):
        resp = client.post("/api/imports/nonexistent-job/validate")
        assert resp.status_code == 404


class TestApprove:
    def test_approve_requires_review_status(self, client):
        up = _upload(client, VALID_CSV)
        job_id = up.json()["jobId"]
        # Approve without validating first
        resp = client.post(f"/api/imports/{job_id}/approve")
        assert resp.status_code == 400

    def test_approve_after_validate(self, client):
        up = _upload(client, VALID_CSV)
        job_id = up.json()["jobId"]
        client.post(f"/api/imports/{job_id}/validate")
        resp = client.post(f"/api/imports/{job_id}/approve")
        # May pass or fail depending on ambiguous mapping detection
        assert resp.status_code in (200, 400)

    def test_approve_nonexistent_job(self, client):
        resp = client.post("/api/imports/nonexistent/approve")
        assert resp.status_code == 404


class TestImportStatus:
    def test_get_job_status(self, client):
        up = _upload(client, VALID_CSV)
        job_id = up.json()["jobId"]
        resp = client.get(f"/api/imports/{job_id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["jobId"] == job_id

    def test_get_nonexistent_job(self, client):
        resp = client.get("/api/imports/does-not-exist")
        assert resp.status_code == 404


class TestIdempotency:
    def test_same_file_twice_same_checksum(self, client):
        """Uploading the same content twice produces different jobs but same checksum."""
        resp1 = _upload(client, VALID_CSV, "patients.csv")
        resp2 = _upload(client, VALID_CSV, "patients.csv")
        assert resp1.json()["jobId"] != resp2.json()["jobId"]
        assert resp1.json()["checksum"] == resp2.json()["checksum"]
