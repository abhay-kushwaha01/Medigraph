"""
JSON parser for medical data files.
Supports:
  - Array of objects: [{"patientId": "P001", ...}, ...]
  - Wrapped array:    {"patients": [...], "records": [...], "data": [...]}
  - FHIR Bundle (basic):  {"resourceType": "Bundle", "entry": [...]}
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple


def parse_json(file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse a JSON file into a flat list of record dicts.

    Returns:
        records — list of dicts
        columns — sorted list of unique keys across all records
    Raises:
        ValueError — unrecognised structure or empty file
    """
    text = file_path.read_bytes()
    if not text.strip():
        raise ValueError("JSON file is empty.")

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON: {exc}") from exc

    records = _extract_records(data)
    if not records:
        raise ValueError("No records found in JSON file.")

    # Build column list from union of all keys
    columns: List[str] = sorted({k for r in records for k in r})
    return records, columns


def _extract_records(data: Any) -> List[Dict[str, Any]]:
    """Normalise various JSON shapes into a flat list of dicts."""
    if isinstance(data, list):
        return [r for r in data if isinstance(r, dict)]

    if isinstance(data, dict):
        # FHIR Bundle
        if data.get("resourceType") == "Bundle":
            return _parse_fhir_bundle(data)

        # Wrapped arrays — look for common wrapper keys
        for key in ("patients", "records", "data", "items", "entries", "results"):
            if key in data and isinstance(data[key], list):
                return [r for r in data[key] if isinstance(r, dict)]

        # Single object — wrap it
        return [data]

    return []


def _parse_fhir_bundle(bundle: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Flatten a FHIR Bundle's entries into plain dicts.
    Preserves resourceType and id at the top level.
    """
    entries = bundle.get("entry", [])
    records = []
    for entry in entries:
        resource = entry.get("resource", {})
        if isinstance(resource, dict):
            flat = {"resourceType": resource.get("resourceType"), "id": resource.get("id")}
            flat.update(resource)
            records.append(flat)
    return records
