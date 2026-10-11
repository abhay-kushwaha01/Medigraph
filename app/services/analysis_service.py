"""
Analysis service — evidence-grounded graph-based medical analysis.

IMPORTANT SAFETY NOTES:
  - This service retrieves documented interactions from the graph only.
  - It never invents drug interactions, citations, or clinical facts.
  - It clearly marks findings as verified/unverified.
  - It adds limitations when evidence is insufficient.
  - It is for medical information support, NOT autonomous diagnosis or prescribing.
  - Real patient data must NOT be sent to external AI services without
    explicit authorisation and appropriate privacy arrangements.
"""
from __future__ import annotations

import logging
import uuid
from typing import List

from neo4j import AsyncSession

from app.schemas.patient import (
    PatientAnalysisRequest,
    PatientAnalysisResponse,
    Finding,
    GraphNode,
    GraphRelationship,
    MedicalSource,
)

logger = logging.getLogger(__name__)


async def analyse_patient(
    session: AsyncSession,
    request: PatientAnalysisRequest,
) -> PatientAnalysisResponse:
    """
    Build a patient analysis response using graph traversal only.
    All findings come from verified data stored in Neo4j.
    """
    findings: List[Finding] = []
    nodes: List[GraphNode] = []
    relationships: List[GraphRelationship] = []
    sources: List[MedicalSource] = []
    limitations: List[str] = []

    # ------------------------------------------------------------------
    # 1. Retrieve patient node (if it exists in the graph)
    # ------------------------------------------------------------------
    patient_result = await session.run(
        "MATCH (p:Patient {patientId: $pid}) RETURN p",
        {"pid": request.patient_id},
    )
    patient_record = await patient_result.single()

    if patient_record:
        p = patient_record["p"]
        nodes.append(
            GraphNode(
                id=str(p.element_id),
                label=request.patient_id,
                type="Patient",
                properties=_sanitise(dict(p)),
            )
        )
    else:
        limitations.append(
            f"Patient '{request.patient_id}' was not found in the graph. "
            "Analysis is based on the submitted request data only."
        )

    # ------------------------------------------------------------------
    # 2. Check documented drug–drug interactions from the graph
    # ------------------------------------------------------------------
    if len(request.current_medications) >= 2:
        interaction_query = """
        MATCH (m1:Medicine)-[i:DOCUMENTED_INTERACTION]-(m2:Medicine)
        WHERE m1.name IN $meds AND m2.name IN $meds AND id(m1) < id(m2)
        OPTIONAL MATCH (i)-[:SUPPORTED_BY]->(src:Source)
        RETURN m1, m2, i, collect(src) AS sources
        """
        result = await session.run(
            interaction_query, {"meds": request.current_medications}
        )
        records = [r async for r in result]

        if not records:
            limitations.append(
                "No documented drug interactions were found in the graph for the "
                "provided medications. This does not confirm the absence of interactions — "
                "the graph may not contain all possible combinations."
            )

        for record in records:
            m1, m2, interaction = record["m1"], record["m2"], record["i"]
            src_nodes = record["sources"]

            finding_id = f"fi-{uuid.uuid4().hex[:8]}"
            finding_sources: List[str] = []

            for s in src_nodes:
                sid = f"src-{uuid.uuid4().hex[:8]}"
                sources.append(
                    MedicalSource(
                        source_id=sid,
                        name=s.get("name", "Unknown source"),
                        url=s.get("url"),
                        last_updated=s.get("lastUpdated"),
                        evidence_level=s.get("evidenceLevel"),
                    )
                )
                finding_sources.append(sid)

            findings.append(
                Finding(
                    finding_id=finding_id,
                    category="drug_interaction",
                    severity=interaction.get("severity", "unknown"),
                    description=(
                        f"Documented interaction between "
                        f"{m1.get('name', 'Medicine A')} and "
                        f"{m2.get('name', 'Medicine B')}: "
                        f"{interaction.get('description', 'Details not available.')}"
                    ),
                    evidence=interaction.get("evidence"),
                    source_ids=finding_sources,
                    is_verified=True,
                )
            )

            # Add medicine nodes and the interaction relationship
            for med_node in (m1, m2):
                nodes.append(
                    GraphNode(
                        id=str(med_node.element_id),
                        label=med_node.get("name", "Medicine"),
                        type="Medicine",
                        properties=_sanitise(dict(med_node)),
                    )
                )
            relationships.append(
                GraphRelationship(
                    id=str(interaction.element_id),
                    source=str(m1.element_id),
                    target=str(m2.element_id),
                    label="DOCUMENTED_INTERACTION",
                    properties=_sanitise(dict(interaction)),
                )
            )

    # ------------------------------------------------------------------
    # 3. Check allergy–ingredient overlaps
    # ------------------------------------------------------------------
    if request.allergies and request.current_medications:
        allergy_query = """
        MATCH (m:Medicine)-[:CONTAINS]->(ing:Ingredient)
        WHERE m.name IN $meds
        MATCH (a:Allergy)-[:HAS_ALLERGEN]->(ing)
        WHERE a.name IN $allergies
        OPTIONAL MATCH (a)-[:SUPPORTED_BY]->(src:Source)
        RETURN m, ing, a, collect(src) AS sources
        """
        result = await session.run(
            allergy_query,
            {
                "meds": request.current_medications,
                "allergies": request.allergies,
            },
        )
        allergy_records = [r async for r in result]

        for record in allergy_records:
            med = record["m"]
            ing = record["ing"]
            allergy = record["a"]
            finding_sources: List[str] = []

            for s in record["sources"]:
                sid = f"src-{uuid.uuid4().hex[:8]}"
                sources.append(
                    MedicalSource(
                        source_id=sid,
                        name=s.get("name", "Unknown source"),
                        url=s.get("url"),
                    )
                )
                finding_sources.append(sid)

            findings.append(
                Finding(
                    finding_id=f"fi-{uuid.uuid4().hex[:8]}",
                    category="allergy_overlap",
                    severity="high",
                    description=(
                        f"{med.get('name', 'A medicine')} contains "
                        f"{ing.get('name', 'an ingredient')} "
                        f"which is associated with the reported allergy to "
                        f"{allergy.get('name', 'an allergen')}."
                    ),
                    evidence="Graph-documented allergy–ingredient relationship.",
                    source_ids=finding_sources,
                    is_verified=True,
                )
            )

    # ------------------------------------------------------------------
    # 4. Mandatory limitation — no treatment recommendations
    # ------------------------------------------------------------------
    limitations.append(
        "This analysis is for medical information support only. "
        "It does not constitute a diagnosis, prescription, or treatment recommendation. "
        "Always consult a qualified healthcare professional before making clinical decisions."
    )

    if not findings:
        limitations.append(
            "No findings were generated. The graph may not yet contain data for the "
            "submitted medications, allergies, or conditions. Upload clinical data via "
            "the /api/imports/upload endpoint to enrich the graph."
        )

    # Deduplicate nodes by id
    seen_ids: set = set()
    unique_nodes: List[GraphNode] = []
    for n in nodes:
        if n.id not in seen_ids:
            unique_nodes.append(n)
            seen_ids.add(n.id)

    return PatientAnalysisResponse(
        patient_id=request.patient_id,
        findings=findings,
        graph_nodes=unique_nodes,
        graph_relationships=relationships,
        sources=sources,
        limitations=limitations,
    )


def _sanitise(props: dict) -> dict:
    out = {}
    for k, v in props.items():
        if hasattr(v, "iso_format"):
            out[k] = v.iso_format()
        elif isinstance(v, (list, tuple)):
            out[k] = list(v)
        else:
            out[k] = v
    return out
