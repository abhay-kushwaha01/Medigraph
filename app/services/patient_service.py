"""
Patient service — retrieve patient nodes and their connected graph data.
"""
from __future__ import annotations

import logging
from typing import Optional

from neo4j import AsyncSession

from app.schemas.patient import PatientResponse

logger = logging.getLogger(__name__)


async def get_patient_by_id(
    session: AsyncSession, patient_id: str
) -> Optional[PatientResponse]:
    """
    Retrieve a patient by stable patientId.
    Returns None when the patient does not exist.
    """
    query = """
    MATCH (p:Patient {patientId: $patientId})
    OPTIONAL MATCH (p)-[:HAS_CONDITION]->(c:Condition)
    OPTIONAL MATCH (p)-[:HAS_ALLERGY]->(a:Allergy)
    OPTIONAL MATCH (p)-[:TAKES]->(m:Medicine)
    OPTIONAL MATCH (p)-[:HAS_ENCOUNTER]->(e:Encounter)
    RETURN p,
           collect(DISTINCT c.name) AS conditions,
           collect(DISTINCT a.name) AS allergies,
           collect(DISTINCT m.name) AS medications,
           count(DISTINCT e)        AS encounterCount
    """
    result = await session.run(query, {"patientId": patient_id})
    record = await result.single()

    if record is None:
        return None

    p = record["p"]
    props = dict(p)

    return PatientResponse(
        patient_id=patient_id,
        age_group=props.pop("ageGroup", None),
        conditions=[c for c in record["conditions"] if c],
        allergies=[a for a in record["allergies"] if a],
        medications=[m for m in record["medications"] if m],
        encounter_count=record["encounterCount"] or 0,
        properties=props,
    )
