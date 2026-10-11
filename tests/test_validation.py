"""
Tests for the validation service.
"""
from __future__ import annotations

import pytest

from app.schemas.imports import FieldMapping
from app.services.validation_service import detect_duplicates, validate_records


def _make_mapping(src: str, tgt: str, node_type: str, required: bool = False) -> FieldMapping:
    return FieldMapping(
        source_field=src,
        target_field=tgt,
        node_type=node_type,
        is_required=required,
        is_ambiguous=False,
    )


class TestValidateRecords:
    def test_valid_patients(self):
        records = [
            {"patientId": "P001", "ageGroup": "30-40"},
            {"patientId": "P002", "ageGroup": "40-50"},
        ]
        mappings = [
            _make_mapping("patientId", "patientId", "Patient", required=True),
            _make_mapping("ageGroup", "ageGroup", "Patient"),
        ]
        valid, issues = validate_records(records, mappings, "Patient")
        assert len(valid) == 2
        errors = [i for i in issues if i.severity == "error"]
        assert not errors

    def test_missing_required_field(self):
        records = [{"ageGroup": "30-40"}]
        mappings = [_make_mapping("patientId", "patientId", "Patient", required=True)]
        valid, issues = validate_records(records, mappings, "Patient")
        assert len(valid) == 0
        assert any(i.severity == "error" for i in issues)

    def test_invalid_patient_id_format(self):
        records = [{"patientId": "P001 BAD ID WITH SPACES!!!"}]
        mappings = [_make_mapping("patientId", "patientId", "Patient", required=True)]
        valid, issues = validate_records(records, mappings, "Patient")
        errors = [i for i in issues if i.severity == "error"]
        assert len(errors) > 0

    def test_valid_patient_id_formats(self):
        for pid in ("P001", "patient-001", "PAT_123", "A"):
            records = [{"patientId": pid}]
            mappings = [_make_mapping("patientId", "patientId", "Patient", required=True)]
            valid, issues = validate_records(records, mappings, "Patient")
            errors = [i for i in issues if i.severity == "error"]
            assert not errors, f"Unexpected error for patientId={pid!r}: {issues}"

    def test_empty_optional_field_gives_warning(self):
        records = [{"patientId": "P001", "ageGroup": ""}]
        mappings = [
            _make_mapping("patientId", "patientId", "Patient", required=True),
            _make_mapping("ageGroup", "ageGroup", "Patient"),
        ]
        _, issues = validate_records(records, mappings, "Patient")
        warnings = [i for i in issues if i.severity == "warning"]
        assert any("ageGroup" in i.field for i in warnings)


class TestDuplicateDetection:
    def test_no_duplicates(self):
        records = [{"patientId": "P001"}, {"patientId": "P002"}, {"patientId": "P003"}]
        deduped, issues = detect_duplicates(records, "patientId")
        assert len(deduped) == 3
        assert not issues

    def test_detects_duplicate(self):
        records = [{"patientId": "P001"}, {"patientId": "P001"}, {"patientId": "P002"}]
        deduped, issues = detect_duplicates(records, "patientId")
        assert len(deduped) == 2
        assert len(issues) == 1
        assert "Duplicate" in issues[0].message

    def test_missing_id_field_passed_through(self):
        records = [{"name": "Alice"}, {"name": "Bob"}]
        deduped, issues = detect_duplicates(records, "patientId")
        assert len(deduped) == 2
        assert not issues
