"""
Tests for CSV, JSON, and XLSX parsers using synthetic data only.
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from app.ingestion.csv_parser import parse_csv
from app.ingestion.json_parser import parse_json


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_tmp(suffix: str, content: bytes) -> Path:
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(content)
        return Path(f.name)


# ---------------------------------------------------------------------------
# CSV parser
# ---------------------------------------------------------------------------

class TestCsvParser:
    def test_valid_csv(self):
        p = _write_tmp(".csv", b"patientId,ageGroup\nP001,30-40\nP002,40-50\n")
        records, cols = parse_csv(p)
        assert len(records) == 2
        assert records[0]["patientId"] == "P001"
        assert "patientId" in cols
        assert "ageGroup" in cols

    def test_csv_strips_whitespace(self):
        p = _write_tmp(".csv", b"patientId , ageGroup \n P001 , 30-40 \n")
        records, cols = parse_csv(p)
        # Values should be stripped
        assert records[0]["patientId"] == "P001"

    def test_csv_empty_raises(self):
        p = _write_tmp(".csv", b"")
        with pytest.raises(ValueError, match="empty"):
            parse_csv(p)

    def test_csv_headers_only(self):
        p = _write_tmp(".csv", b"patientId,ageGroup\n")
        records, cols = parse_csv(p)
        assert records == []
        assert "patientId" in cols

    def test_csv_utf8_bom(self):
        """BOM-prefixed CSV (common from Excel) should be handled."""
        bom = b"\xef\xbb\xbf"
        p = _write_tmp(".csv", bom + b"patientId,ageGroup\nP001,30-40\n")
        records, cols = parse_csv(p)
        assert len(records) == 1
        # BOM should be stripped
        assert "patientId" in cols

    def test_csv_latin1_encoding(self):
        content = "patientId,name\nP001,Ren\xe9\n".encode("latin-1")
        p = _write_tmp(".csv", content)
        records, cols = parse_csv(p)
        assert len(records) == 1


# ---------------------------------------------------------------------------
# JSON parser
# ---------------------------------------------------------------------------

class TestJsonParser:
    def test_array_of_objects(self):
        data = [{"patientId": "P001"}, {"patientId": "P002"}]
        p = _write_tmp(".json", json.dumps(data).encode())
        records, cols = parse_json(p)
        assert len(records) == 2
        assert "patientId" in cols

    def test_wrapped_object(self):
        data = {"patients": [{"patientId": "P001"}, {"patientId": "P002"}]}
        p = _write_tmp(".json", json.dumps(data).encode())
        records, cols = parse_json(p)
        assert len(records) == 2

    def test_single_object(self):
        data = {"patientId": "P001", "ageGroup": "30-40"}
        p = _write_tmp(".json", json.dumps(data).encode())
        records, cols = parse_json(p)
        assert len(records) == 1
        assert records[0]["patientId"] == "P001"

    def test_fhir_bundle(self):
        bundle = {
            "resourceType": "Bundle",
            "type": "collection",
            "entry": [
                {"resource": {"resourceType": "Patient", "id": "fhir-001",
                               "name": [{"given": ["Jane"], "family": "Doe"}]}}
            ],
        }
        p = _write_tmp(".json", json.dumps(bundle).encode())
        records, cols = parse_json(p)
        assert len(records) == 1
        assert records[0].get("resourceType") == "Patient"

    def test_empty_file_raises(self):
        p = _write_tmp(".json", b"")
        with pytest.raises(ValueError):
            parse_json(p)

    def test_invalid_json_raises(self):
        p = _write_tmp(".json", b"not valid json {{{")
        with pytest.raises(ValueError, match="Invalid JSON"):
            parse_json(p)

    def test_empty_array_raises(self):
        p = _write_tmp(".json", b"[]")
        with pytest.raises(ValueError, match="No records"):
            parse_json(p)


# ---------------------------------------------------------------------------
# XLSX parser
# ---------------------------------------------------------------------------

class TestXlsxParser:
    def test_xlsx_parse(self):
        """Create a minimal XLSX in memory and parse it."""
        pytest.importorskip("openpyxl")
        import openpyxl
        import tempfile

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["patientId", "ageGroup", "condition"])
        ws.append(["P001", "30-40", "Asthma"])
        ws.append(["P002", "40-50", "Diabetes"])

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as f:
            wb.save(f.name)
            p = Path(f.name)

        from app.ingestion.xlsx_parser import parse_xlsx
        records, cols = parse_xlsx(p)
        assert len(records) == 2
        assert records[0]["patientId"] == "P001"
        assert "patientId" in cols

    def test_xlsx_empty_raises(self):
        pytest.importorskip("openpyxl")
        import openpyxl, tempfile

        wb = openpyxl.Workbook()
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as f:
            wb.save(f.name)
            p = Path(f.name)

        from app.ingestion.xlsx_parser import parse_xlsx
        with pytest.raises(ValueError):
            parse_xlsx(p)
