"""
File import endpoints.

Workflow: Upload → Validate → Preview → Approve → Execute → Report

POST /api/imports/upload
GET  /api/imports/{jobId}
GET  /api/imports/{jobId}/preview
POST /api/imports/{jobId}/validate
POST /api/imports/{jobId}/approve
POST /api/imports/{jobId}/execute
GET  /api/imports/{jobId}/report

Security:
  - File type and size are checked before storage.
  - Uploaded files are stored under safe, randomised names (never the original filename on disk).
  - Path traversal is prevented by using pathlib and never constructing paths from user input.
  - Approval is required before any real data reaches Neo4j.
  - Ambiguous field mappings block approval.
"""
from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from neo4j import AsyncSession

from app.config import get_settings
from app.database import get_db, is_connected
from app.schemas.imports import ImportJobResponse, ImportPreview, ImportReport
from app.services.import_service import (
    approve_job,
    create_job,
    execute_job,
    get_job,
    get_preview,
    get_report,
    validate_job,
)

router = APIRouter(prefix="/imports", tags=["Imports"])

MAX_FILENAME_LEN = 255


def _safe_extension(filename: str) -> str:
    """Extract and lowercase the file extension. Returns '' for dotfiles."""
    parts = filename.rsplit(".", 1)
    return parts[-1].lower() if len(parts) == 2 else ""


def _require_job_or_404(job) -> None:
    if job is None:
        raise HTTPException(status_code=404, detail="Import job not found.")


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@router.post(
    "/upload",
    response_model=ImportJobResponse,
    response_model_by_alias=True,
    status_code=201,
    summary="Upload a medical data file for import",
)
async def upload_file(file: UploadFile = File(...)) -> ImportJobResponse:
    """
    Accept a multipart file upload.  Supported formats: CSV, JSON, XLSX.

    The file is stored securely under a randomised name.  A job ID is returned
    that you must use in subsequent validate/approve/execute calls.

    **Do not send files containing real patient data to an unsecured instance.**
    """
    settings = get_settings()

    # --- filename safety ---
    original_name = file.filename or "upload"
    if len(original_name) > MAX_FILENAME_LEN:
        raise HTTPException(status_code=400, detail="Filename too long.")

    ext = _safe_extension(original_name)
    if not ext or ext not in settings.allowed_extension_set:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '.{ext}'. "
                f"Allowed: {', '.join(sorted(settings.allowed_extension_set))}."
            ),
        )

    # --- size check ---
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {settings.max_upload_size_mb} MB limit.",
        )
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    job = await create_job(original_name, content, ext)
    return job


# ---------------------------------------------------------------------------
# Job status
# ---------------------------------------------------------------------------

@router.get(
    "/{jobId}",
    response_model=ImportJobResponse,
    response_model_by_alias=True,
    summary="Get import job status",
)
async def get_job_status(jobId: str) -> ImportJobResponse:
    job = await get_job(jobId)
    _require_job_or_404(job)
    return job


# ---------------------------------------------------------------------------
# Preview
# ---------------------------------------------------------------------------

@router.get(
    "/{jobId}/preview",
    response_model=ImportPreview,
    response_model_by_alias=True,
    summary="Preview parsed records and field mappings",
)
async def preview(jobId: str) -> ImportPreview:
    """
    Returns the first 5 records, detected column names, inferred field mappings,
    and any validation issues.  Call /validate first if you haven't already.
    """
    p = await get_preview(jobId)
    if p is None:
        job = await get_job(jobId)
        _require_job_or_404(job)
        raise HTTPException(
            status_code=400,
            detail="No preview available. Call POST /{jobId}/validate first.",
        )
    return p


# ---------------------------------------------------------------------------
# Validate
# ---------------------------------------------------------------------------

@router.post(
    "/{jobId}/validate",
    response_model=ImportPreview,
    response_model_by_alias=True,
    summary="Parse and validate the uploaded file",
)
async def validate(jobId: str) -> ImportPreview:
    """
    Parses the file, infers field mappings, and validates every record.
    Sets status to `awaiting_review` on success.
    Returns validation issues without discarding them silently.
    """
    preview_result, error = await validate_job(jobId)
    if error:
        job = await get_job(jobId)
        _require_job_or_404(job)
        raise HTTPException(status_code=400, detail=error)
    return preview_result


# ---------------------------------------------------------------------------
# Approve
# ---------------------------------------------------------------------------

@router.post(
    "/{jobId}/approve",
    response_model=ImportJobResponse,
    response_model_by_alias=True,
    summary="Approve a validated import job for execution",
)
async def approve(jobId: str) -> ImportJobResponse:
    """
    Human approval gate — required before any data reaches Neo4j.
    Blocked when the job has unresolved ambiguous field mappings.
    """
    job_response, error = await approve_job(jobId)
    if error:
        job = await get_job(jobId)
        _require_job_or_404(job)
        raise HTTPException(status_code=400, detail=error)
    return job_response


# ---------------------------------------------------------------------------
# Execute
# ---------------------------------------------------------------------------

@router.post(
    "/{jobId}/execute",
    response_model=ImportReport,
    response_model_by_alias=True,
    summary="Import approved records into Neo4j",
)
async def execute(
    jobId: str,
    session: AsyncSession = Depends(get_db),
) -> ImportReport:
    """
    Imports all valid, approved records into Neo4j using MERGE (idempotent).
    Returns a detailed report including counts and any remaining issues.

    Running the same approved job twice is safe — MERGE prevents duplication.
    """
    if not is_connected():
        raise HTTPException(
            status_code=503,
            detail="Neo4j is not connected. Import cannot proceed.",
        )
    report, error = await execute_job(jobId, session)
    if error:
        job = await get_job(jobId)
        _require_job_or_404(job)
        raise HTTPException(status_code=400, detail=error)
    return report


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

@router.get(
    "/{jobId}/report",
    response_model=ImportReport,
    response_model_by_alias=True,
    summary="Retrieve the import report after execution",
)
async def report(jobId: str) -> ImportReport:
    r = await get_report(jobId)
    if r is None:
        job = await get_job(jobId)
        _require_job_or_404(job)
        raise HTTPException(
            status_code=400,
            detail="No report available yet. The job may not have been executed.",
        )
    return r
