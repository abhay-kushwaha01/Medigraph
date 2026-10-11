"""
File import job schemas.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import Field

from app.schemas.patient import CamelModel


class JobStatus(str, Enum):
    PENDING = "pending"
    PARSING = "parsing"
    VALIDATING = "validating"
    AWAITING_REVIEW = "awaiting_review"
    APPROVED = "approved"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"


class FieldMapping(CamelModel):
    source_field: str = Field(..., alias="sourceField")
    target_field: str = Field(..., alias="targetField")
    node_type: str = Field(..., alias="nodeType")
    is_required: bool = Field(False, alias="isRequired")
    is_ambiguous: bool = Field(False, alias="isAmbiguous")
    notes: Optional[str] = None


class ValidationIssue(CamelModel):
    row: Optional[int] = None
    field: Optional[str] = None
    severity: str = "error"   # "error" | "warning" | "info"
    message: str
    raw_value: Optional[str] = Field(None, alias="rawValue")


class ImportPreview(CamelModel):
    job_id: str = Field(..., alias="jobId")
    file_name: str = Field(..., alias="fileName")
    file_type: str = Field(..., alias="fileType")
    total_records: int = Field(..., alias="totalRecords")
    sample_records: List[Dict[str, Any]] = Field(default_factory=list, alias="sampleRecords")
    detected_columns: List[str] = Field(default_factory=list, alias="detectedColumns")
    field_mappings: List[FieldMapping] = Field(default_factory=list, alias="fieldMappings")
    validation_issues: List[ValidationIssue] = Field(default_factory=list, alias="validationIssues")
    has_ambiguous_mappings: bool = Field(False, alias="hasAmbiguousMappings")


class ImportJobResponse(CamelModel):
    job_id: str = Field(..., alias="jobId")
    status: JobStatus
    file_name: str = Field(..., alias="fileName")
    file_type: str = Field(..., alias="fileType")
    file_size: int = Field(..., alias="fileSize")
    checksum: str
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    message: Optional[str] = None
    error: Optional[str] = None


class ImportReport(CamelModel):
    job_id: str = Field(..., alias="jobId")
    status: JobStatus
    file_name: str = Field(..., alias="fileName")
    total_records: int = Field(0, alias="totalRecords")
    records_imported: int = Field(0, alias="recordsImported")
    records_skipped: int = Field(0, alias="recordsSkipped")
    records_failed: int = Field(0, alias="recordsFailed")
    nodes_created: int = Field(0, alias="nodesCreated")
    relationships_created: int = Field(0, alias="relationshipsCreated")
    validation_issues: List[ValidationIssue] = Field(default_factory=list, alias="validationIssues")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    duration_seconds: Optional[float] = Field(None, alias="durationSeconds")
    message: Optional[str] = None
