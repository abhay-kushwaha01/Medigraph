"""
Validation service — validates parsed records before graph import.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from app.schemas.imports import FieldMapping, ValidationIssue

# Required fields per node type
REQUIRED_FIELDS: Dict[str, List[str]] = {
    "Patient": ["patientId"],
    "Condition": ["code"],
    "Medicine": ["code"],
    "Ingredient": ["ingredientId"],
    "Allergy": ["allergyId"],
    "Encounter": ["encounterId"],
    "Observation": ["observationId"],
    "Organization": ["organizationId"],
}

PATIENT_ID_RE = re.compile(r"^[A-Za-z0-9_\-]{1,64}$")


def validate_records(
    records: List[Dict[str, Any]],
    mappings: List[FieldMapping],
    node_type: str,
) -> Tuple[List[Dict[str, Any]], List[ValidationIssue]]:
    """
    Validate a list of records against the field mappings and node-type rules.
    Returns (valid_records, issues).
    Invalid records are excluded from valid_records but are documented in issues.
    """
    issues: List[ValidationIssue] = []
    valid: List[Dict[str, Any]] = []
    required = REQUIRED_FIELDS.get(node_type, [])

    for idx, record in enumerate(records):
        row_issues: List[ValidationIssue] = []

        # Check required fields
        for req in required:
            val = record.get(req)
            if val is None or str(val).strip() == "":
                row_issues.append(
                    ValidationIssue(
                        row=idx + 1,
                        field=req,
                        severity="error",
                        message=f"Required field '{req}' is missing or empty.",
                        raw_value=None,
                    )
                )

        # Patient-ID format check
        if node_type == "Patient":
            pid = str(record.get("patientId", ""))
            if pid and not PATIENT_ID_RE.match(pid):
                row_issues.append(
                    ValidationIssue(
                        row=idx + 1,
                        field="patientId",
                        severity="error",
                        message="patientId must be 1–64 alphanumeric/dash/underscore characters.",
                        raw_value=pid,
                    )
                )

        # Warn about empty non-required fields
        for mapping in mappings:
            if mapping.target_field not in required:
                val = record.get(mapping.target_field)
                if val is None or str(val).strip() == "":
                    row_issues.append(
                        ValidationIssue(
                            row=idx + 1,
                            field=mapping.target_field,
                            severity="warning",
                            message=f"Optional field '{mapping.target_field}' is empty.",
                            raw_value=None,
                        )
                    )

        issues.extend(row_issues)
        has_errors = any(i.severity == "error" for i in row_issues)
        if not has_errors:
            valid.append(record)

    return valid, issues


def detect_duplicates(
    records: List[Dict[str, Any]],
    id_field: str,
) -> Tuple[List[Dict[str, Any]], List[ValidationIssue]]:
    """
    Detect duplicate records by id_field within the uploaded batch.
    Returns (deduplicated_records, duplicate_issues).
    """
    seen: Dict[str, int] = {}
    deduped: List[Dict[str, Any]] = []
    issues: List[ValidationIssue] = []

    for idx, record in enumerate(records):
        key = str(record.get(id_field, ""))
        if not key:
            deduped.append(record)
            continue
        if key in seen:
            issues.append(
                ValidationIssue(
                    row=idx + 1,
                    field=id_field,
                    severity="warning",
                    message=f"Duplicate {id_field}='{key}' (first seen at row {seen[key] + 1}). Record skipped.",
                    raw_value=key,
                )
            )
        else:
            seen[key] = idx
            deduped.append(record)

    return deduped, issues
