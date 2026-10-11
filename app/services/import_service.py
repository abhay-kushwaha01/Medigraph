"""
Import service — manages upload jobs from creation through Neo4j execution.

Job storage is file-based (JSON on disk) so state survives a process restart.
For production workloads, replace the file store with a proper database.
The docstring on each public function describes the limitation.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.config import get_settings
from app.schemas.imports import (
    FieldMapping,
    ImportJobResponse,
    ImportPreview,
    ImportReport,
    JobStatus,
    ValidationIssue,
)

logger = logging.getLogger(__name__)


def _jobs_dir() -> Path:
    settings = get_settings()
    p = Path(settings.upload_dir) / "jobs"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _uploads_dir() -> Path:
    settings = get_settings()
    p = Path(settings.upload_dir) / "files"
    p.mkdir(parents=True, exist_ok=True)
    return p


# ---------------------------------------------------------------------------
# Low-level job store  (file-based)
# ---------------------------------------------------------------------------

def _job_path(job_id: str) -> Path:
    return _jobs_dir() / f"{job_id}.json"


def _load_job(job_id: str) -> Optional[Dict[str, Any]]:
    p = _job_path(job_id)
    if not p.exists():
        return None
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save_job(data: Dict[str, Any]) -> None:
    p = _job_path(data["jobId"])
    with p.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def _update_job(job_id: str, **kwargs) -> Optional[Dict[str, Any]]:
    data = _load_job(job_id)
    if data is None:
        return None
    data.update(kwargs)
    data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    _save_job(data)
    return data


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def create_job(
    filename: str,
    file_content: bytes,
    file_ext: str,
) -> ImportJobResponse:
    """
    Persist the uploaded file and create a new import job.
    Returns the job response with status=PENDING.
    """
    job_id = str(uuid.uuid4())
    checksum = hashlib.sha256(file_content).hexdigest()
    now = datetime.now(timezone.utc).isoformat()

    # Store file safely — never use the original filename on disk
    safe_name = f"{job_id}.{file_ext}"
    file_path = _uploads_dir() / safe_name
    file_path.write_bytes(file_content)

    job_data: Dict[str, Any] = {
        "jobId": job_id,
        "status": JobStatus.PENDING.value,
        "fileName": filename,
        "fileType": file_ext,
        "fileSize": len(file_content),
        "checksum": checksum,
        "filePath": str(file_path),
        "createdAt": now,
        "updatedAt": now,
        "message": "File received. Run /validate to begin processing.",
        "error": None,
        "preview": None,
        "report": None,
    }
    _save_job(job_data)
    return _to_job_response(job_data)


async def get_job(job_id: str) -> Optional[ImportJobResponse]:
    data = _load_job(job_id)
    if data is None:
        return None
    return _to_job_response(data)


async def get_preview(job_id: str) -> Optional[ImportPreview]:
    data = _load_job(job_id)
    if data is None or data.get("preview") is None:
        return None
    return ImportPreview(**data["preview"])


async def validate_job(job_id: str) -> Tuple[Optional[ImportPreview], Optional[str]]:
    """
    Parse and validate the uploaded file.
    Returns (preview, error_message).
    """
    from app.ingestion.csv_parser import parse_csv
    from app.ingestion.json_parser import parse_json
    from app.ingestion.xlsx_parser import parse_xlsx
    from app.services.validation_service import validate_records, detect_duplicates

    data = _load_job(job_id)
    if data is None:
        return None, "Job not found."
    if data["status"] not in (JobStatus.PENDING.value, JobStatus.AWAITING_REVIEW.value):
        return None, f"Job is in status '{data['status']}'; cannot re-validate."

    _update_job(job_id, status=JobStatus.VALIDATING.value, message="Parsing file…")

    file_path = Path(data["filePath"])
    file_ext = data["fileType"].lower()

    try:
        if file_ext == "csv":
            records, columns = parse_csv(file_path)
        elif file_ext in ("xlsx", "xls"):
            records, columns = parse_xlsx(file_path)
        elif file_ext == "json":
            records, columns = parse_json(file_path)
        else:
            _update_job(job_id, status=JobStatus.FAILED.value, error=f"Unsupported file type: {file_ext}")
            return None, f"Unsupported file type: {file_ext}"
    except Exception as exc:
        msg = f"Parse error: {exc}"
        _update_job(job_id, status=JobStatus.FAILED.value, error=msg)
        return None, msg

    # Auto-detect node type and build field mappings
    node_type, mappings, ambiguous = _infer_mappings(columns)

    # Validate
    valid_records, issues = validate_records(records, mappings, node_type)
    id_field = _id_field_for(node_type)
    if id_field:
        valid_records, dup_issues = detect_duplicates(valid_records, id_field)
        issues.extend(dup_issues)

    preview_data = {
        "jobId": job_id,
        "fileName": data["fileName"],
        "fileType": file_ext,
        "totalRecords": len(records),
        "sampleRecords": records[:5],
        "detectedColumns": columns,
        "fieldMappings": [m.model_dump(by_alias=True) for m in mappings],
        "validationIssues": [i.model_dump(by_alias=True) for i in issues],
        "hasAmbiguousMappings": ambiguous,
        "nodeType": node_type,
        "validRecordCount": len(valid_records),
    }

    _update_job(
        job_id,
        status=JobStatus.AWAITING_REVIEW.value,
        message=(
            f"Validation complete. {len(valid_records)}/{len(records)} records valid. "
            "Review mappings and approve to import."
        ),
        preview=preview_data,
    )
    return ImportPreview(**preview_data), None


async def approve_job(job_id: str) -> Tuple[Optional[ImportJobResponse], Optional[str]]:
    data = _load_job(job_id)
    if data is None:
        return None, "Job not found."
    if data["status"] != JobStatus.AWAITING_REVIEW.value:
        return None, f"Job must be in '{JobStatus.AWAITING_REVIEW.value}' status to approve."
    if data.get("preview", {}).get("hasAmbiguousMappings"):
        return None, (
            "Job has ambiguous field mappings that require human review. "
            "Resolve mappings before approving."
        )
    updated = _update_job(
        job_id,
        status=JobStatus.APPROVED.value,
        message="Approved. Call /execute to import into Neo4j.",
    )
    return _to_job_response(updated), None


async def execute_job(job_id: str, db_session) -> Tuple[Optional[ImportReport], Optional[str]]:
    """
    Import validated, approved records into Neo4j.
    Uses MERGE to be idempotent — running the same file twice is safe.
    """
    from app.ingestion.csv_parser import parse_csv
    from app.ingestion.json_parser import parse_json
    from app.ingestion.xlsx_parser import parse_xlsx
    from app.services.validation_service import validate_records, detect_duplicates

    data = _load_job(job_id)
    if data is None:
        return None, "Job not found."
    if data["status"] != JobStatus.APPROVED.value:
        return None, f"Job must be approved before executing. Current status: '{data['status']}'."

    _update_job(job_id, status=JobStatus.EXECUTING.value, message="Importing into Neo4j…")

    file_path = Path(data["filePath"])
    file_ext = data["fileType"].lower()
    start = time.monotonic()

    try:
        if file_ext == "csv":
            records, columns = parse_csv(file_path)
        elif file_ext in ("xlsx", "xls"):
            records, columns = parse_xlsx(file_path)
        elif file_ext == "json":
            records, columns = parse_json(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
    except Exception as exc:
        _update_job(job_id, status=JobStatus.FAILED.value, error=str(exc))
        return None, str(exc)

    node_type = data.get("preview", {}).get("nodeType", "Patient")
    mappings_raw = data.get("preview", {}).get("fieldMappings", [])
    mappings = [FieldMapping(**m) for m in mappings_raw]
    id_field = _id_field_for(node_type)

    valid_records, issues = validate_records(records, mappings, node_type)
    if id_field:
        valid_records, dup_issues = detect_duplicates(valid_records, id_field)
        issues.extend(dup_issues)

    nodes_created = 0
    rels_created = 0
    records_failed = 0

    try:
        nodes_created, rels_created = await _import_records(
            db_session, valid_records, node_type, job_id
        )
    except Exception as exc:
        logger.error("Import execution error: %s", exc)
        _update_job(job_id, status=JobStatus.FAILED.value, error=str(exc))
        return None, str(exc)

    duration = time.monotonic() - start
    report_data = {
        "jobId": job_id,
        "status": JobStatus.COMPLETED.value,
        "fileName": data["fileName"],
        "totalRecords": len(records),
        "recordsImported": len(valid_records),
        "recordsSkipped": len(records) - len(valid_records),
        "recordsFailed": records_failed,
        "nodesCreated": nodes_created,
        "relationshipsCreated": rels_created,
        "validationIssues": [i.model_dump(by_alias=True) for i in issues],
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "durationSeconds": round(duration, 3),
        "message": f"Import complete. {len(valid_records)} records imported into Neo4j.",
    }

    _update_job(
        job_id,
        status=JobStatus.COMPLETED.value,
        message=report_data["message"],
        report=report_data,
    )
    return ImportReport(**report_data), None


async def get_report(job_id: str) -> Optional[ImportReport]:
    data = _load_job(job_id)
    if data is None or data.get("report") is None:
        return None
    return ImportReport(**data["report"])


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _to_job_response(data: Dict[str, Any]) -> ImportJobResponse:
    return ImportJobResponse(
        job_id=data["jobId"],
        status=data["status"],
        file_name=data["fileName"],
        file_type=data["fileType"],
        file_size=data["fileSize"],
        checksum=data["checksum"],
        created_at=data["createdAt"],
        updated_at=data["updatedAt"],
        message=data.get("message"),
        error=data.get("error"),
    )


# Column name → (target_field, node_type) hints
_COLUMN_HINTS: Dict[str, Tuple[str, str]] = {
    "patientid": ("patientId", "Patient"),
    "patient_id": ("patientId", "Patient"),
    "patient id": ("patientId", "Patient"),
    "age_group": ("ageGroup", "Patient"),
    "agegroup": ("ageGroup", "Patient"),
    "condition": ("name", "Condition"),
    "condition_code": ("code", "Condition"),
    "conditioncode": ("code", "Condition"),
    "icd10": ("code", "Condition"),
    "medicine": ("name", "Medicine"),
    "medication": ("name", "Medicine"),
    "drug": ("name", "Medicine"),
    "rxcui": ("code", "Medicine"),
    "allergy": ("name", "Allergy"),
    "allergyid": ("allergyId", "Allergy"),
    "ingredient": ("name", "Ingredient"),
    "ingredientid": ("ingredientId", "Ingredient"),
    "encounterid": ("encounterId", "Encounter"),
    "encounter_id": ("encounterId", "Encounter"),
}


def _infer_mappings(
    columns: List[str],
) -> Tuple[str, List[FieldMapping], bool]:
    """
    Heuristically infer field mappings and the dominant node type.
    Returns (node_type, mappings, has_ambiguous).
    """
    node_votes: Dict[str, int] = {}
    mappings: List[FieldMapping] = []
    ambiguous = False

    for col in columns:
        key = col.strip().lower()
        hint = _COLUMN_HINTS.get(key)
        if hint:
            target_field, node_type_hint = hint
            node_votes[node_type_hint] = node_votes.get(node_type_hint, 0) + 1
            mappings.append(
                FieldMapping(
                    source_field=col,
                    target_field=target_field,
                    node_type=node_type_hint,
                    is_required=target_field in REQUIRED_FIELDS.get(node_type_hint, []),
                    is_ambiguous=False,
                )
            )
        else:
            # Unknown column — mark ambiguous, map to itself
            mappings.append(
                FieldMapping(
                    source_field=col,
                    target_field=col,
                    node_type="Unknown",
                    is_required=False,
                    is_ambiguous=True,
                    notes="Column not recognised. Human review required.",
                )
            )
            ambiguous = True

    dominant_type = max(node_votes, key=node_votes.get) if node_votes else "Patient"
    return dominant_type, mappings, ambiguous


def _id_field_for(node_type: str) -> Optional[str]:
    from app.services.validation_service import REQUIRED_FIELDS
    fields = REQUIRED_FIELDS.get(node_type, [])
    return fields[0] if fields else None


async def _import_records(
    session,
    records: List[Dict[str, Any]],
    node_type: str,
    job_id: str,
) -> Tuple[int, int]:
    """
    MERGE each record as a node into Neo4j.
    Records that already exist are updated (upsert semantics).
    Returns (nodes_created_or_merged, 0) — relationship creation is
    reserved for richer FHIR/multi-entity imports.
    """
    if not records:
        return 0, 0

    # Build a generic MERGE query using the primary ID field
    id_field = _id_field_for(node_type) or "id"
    count = 0

    for record in records:
        # Attach provenance
        record["_importJobId"] = job_id
        record["_importedAt"] = datetime.now(timezone.utc).isoformat()

        id_val = record.get(id_field)
        if id_val is None:
            continue

        cypher = (
            f"MERGE (n:{node_type} {{{id_field}: $idVal}}) "
            "SET n += $props "
            "RETURN n"
        )
        await session.run(cypher, {"idVal": str(id_val), "props": record})
        count += 1

    return count, 0
