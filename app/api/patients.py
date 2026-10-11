"""
GET /api/patients/{patientId} — retrieve a patient by stable ID.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncSession

from app.database import get_db, is_connected
from app.schemas.patient import PatientResponse
from app.services.patient_service import get_patient_by_id

router = APIRouter()


@router.get(
    "/patients/{patientId}",
    response_model=PatientResponse,
    response_model_by_alias=True,
    summary="Retrieve a patient by their stable patient ID",
    tags=["Patients"],
)
async def get_patient(
    patientId: str,
    session: AsyncSession = Depends(get_db),
) -> PatientResponse:
    """
    Returns the patient node and their linked conditions, allergies,
    medications, and encounter count.

    Patients are identified by their stable `patientId` property —
    never by name alone.
    """
    if not is_connected():
        raise HTTPException(
            status_code=503,
            detail="Neo4j database is not connected. Check /api/health for details.",
        )

    # Basic sanitisation
    patient_id = patientId.strip()
    if not patient_id:
        raise HTTPException(status_code=400, detail="patientId must not be empty.")
    if len(patient_id) > 64:
        raise HTTPException(status_code=400, detail="patientId exceeds maximum length of 64.")

    try:
        patient = await get_patient_by_id(session, patient_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Patient retrieval error: {type(exc).__name__}",
        )

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail=f"Patient '{patient_id}' not found in the knowledge graph.",
        )

    return patient
