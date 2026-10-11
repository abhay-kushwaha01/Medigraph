"""
Patient-related Pydantic schemas.
All JSON output uses camelCase (alias_generator) so the TypeScript frontend
can consume it without transformation.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Shared config mixin
# ---------------------------------------------------------------------------

class CamelModel(BaseModel):
    """Base model that serialises field names as camelCase in JSON."""

    model_config = {
        "populate_by_name": True,
        "from_attributes": True,
    }

    def model_dump_camel(self, **kwargs) -> dict:
        return self.model_dump(by_alias=True, **kwargs)


# ---------------------------------------------------------------------------
# Request body
# ---------------------------------------------------------------------------

class PatientAnalysisRequest(CamelModel):
    patient_id: str = Field(..., alias="patientId", min_length=1, max_length=64)
    age_group: Optional[str] = Field(None, alias="ageGroup", max_length=32)
    conditions: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    current_medications: List[str] = Field(default_factory=list, alias="currentMedications")

    @field_validator("conditions", "allergies", "current_medications", mode="before")
    @classmethod
    def _coerce_list(cls, v):
        if v is None:
            return []
        return v


# ---------------------------------------------------------------------------
# Graph primitives  (shared with graph.py but defined here for import clarity)
# ---------------------------------------------------------------------------

class GraphNode(CamelModel):
    id: str
    label: str
    type: str
    properties: Dict[str, Any] = Field(default_factory=dict)


class GraphRelationship(CamelModel):
    id: str
    source: str
    target: str
    label: str
    properties: Dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Analysis response sub-models
# ---------------------------------------------------------------------------

class MedicalSource(CamelModel):
    source_id: str = Field(..., alias="sourceId")
    name: str
    url: Optional[str] = None
    last_updated: Optional[str] = Field(None, alias="lastUpdated")
    evidence_level: Optional[str] = Field(None, alias="evidenceLevel")


class Finding(CamelModel):
    finding_id: str = Field(..., alias="findingId")
    category: str                     # e.g. "drug_interaction", "contraindication"
    severity: Optional[str] = None    # "high" | "medium" | "low" | "unknown"
    description: str
    evidence: Optional[str] = None
    source_ids: List[str] = Field(default_factory=list, alias="sourceIds")
    is_verified: bool = Field(False, alias="isVerified")


# ---------------------------------------------------------------------------
# Top-level analysis response  (must match frontend contract exactly)
# ---------------------------------------------------------------------------

class PatientAnalysisResponse(CamelModel):
    patient_id: str = Field(..., alias="patientId")
    findings: List[Finding] = Field(default_factory=list)
    graph_nodes: List[GraphNode] = Field(default_factory=list, alias="graphNodes")
    graph_relationships: List[GraphRelationship] = Field(
        default_factory=list, alias="graphRelationships"
    )
    sources: List[MedicalSource] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Patient node response
# ---------------------------------------------------------------------------

class PatientResponse(CamelModel):
    patient_id: str = Field(..., alias="patientId")
    age_group: Optional[str] = Field(None, alias="ageGroup")
    conditions: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    medications: List[str] = Field(default_factory=list)
    encounter_count: int = Field(0, alias="encounterCount")
    properties: Dict[str, Any] = Field(default_factory=dict)
