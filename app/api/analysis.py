"""
POST /api/patient-analysis — evidence-grounded medical analysis.

IMPORTANT: This endpoint is for medical information support only.
It does NOT provide diagnosis, prescribing, or treatment recommendations.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncSession

from app.database import get_db, is_connected
from app.schemas.patient import PatientAnalysisRequest, PatientAnalysisResponse
from app.services.analysis_service import analyse_patient

router = APIRouter()


@router.post(
    "/patient-analysis",
    response_model=PatientAnalysisResponse,
    response_model_by_alias=True,
    summary="Evidence-grounded patient analysis using the knowledge graph",
    tags=["Analysis"],
)
async def patient_analysis(
    request: PatientAnalysisRequest,
    session: AsyncSession = Depends(get_db),
) -> PatientAnalysisResponse:
    """
    Analyses a patient context against the medical knowledge graph.

    Returns documented findings (drug interactions, allergy overlaps) backed by
    evidence stored in the graph. Never invents interactions or citations.

    The `limitations` field always includes a disclaimer that this is for
    information support only — not autonomous diagnosis or prescribing.

    **Example request body:**
    ```json
    {
        "patientId": "P001",
        "ageGroup": "30-40",
        "conditions": ["Asthma"],
        "allergies": ["Penicillin"],
        "currentMedications": ["Amoxicillin", "Salbutamol"]
    }
    ```
    """
    if not is_connected():
        raise HTTPException(
            status_code=503,
            detail="Neo4j database is not connected. Check /api/health for details.",
        )

    try:
        result = await analyse_patient(session, request)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis error: {type(exc).__name__}",
        )

    return result
