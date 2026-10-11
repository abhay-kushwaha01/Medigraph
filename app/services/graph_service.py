"""
Graph service — retrieve nodes and relationships from Neo4j.
Never fabricates data; returns empty collections on an empty database.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

from neo4j import AsyncSession

from app.config import get_settings
from app.schemas.patient import GraphNode, GraphRelationship

logger = logging.getLogger(__name__)

# Node labels we actively model; used for colouring in the frontend
KNOWN_LABELS = {
    "Patient", "Condition", "Allergy", "Medicine", "Ingredient",
    "Encounter", "Observation", "Organization", "Source", "Interaction",
}


def _node_to_schema(element_id: str, labels: list, props: dict) -> GraphNode:
    label = labels[0] if labels else "Unknown"
    return GraphNode(
        id=element_id,
        label=props.get("name") or props.get("patientId") or props.get("code") or element_id,
        type=label,
        properties=_sanitise(props),
    )


def _rel_to_schema(element_id: str, rel_type: str,
                   start_id: str, end_id: str, props: dict) -> GraphRelationship:
    return GraphRelationship(
        id=element_id,
        source=start_id,
        target=end_id,
        label=rel_type,
        properties=_sanitise(props),
    )


def _sanitise(props: dict) -> dict:
    """Convert Neo4j property types to JSON-serialisable equivalents."""
    out: Dict[str, Any] = {}
    for k, v in props.items():
        if hasattr(v, "iso_format"):          # neo4j.time types
            out[k] = v.iso_format()
        elif isinstance(v, (list, tuple)):
            out[k] = list(v)
        else:
            out[k] = v
    return out


async def get_graph(
    session: AsyncSession,
    limit: int | None = None,
) -> Tuple[List[GraphNode], List[GraphRelationship], bool]:
    """
    Fetch up to *limit* nodes and their relationships.
    Returns (nodes, relationships, is_truncated).
    """
    settings = get_settings()
    max_nodes = min(limit or settings.default_graph_limit, settings.max_graph_limit)

    # --- nodes ---
    node_query = "MATCH (n) RETURN n LIMIT $limit"
    result = await session.run(node_query, {"limit": max_nodes})
    records = [r async for r in result]

    nodes: List[GraphNode] = []
    node_ids: set = set()
    for record in records:
        n = record["n"]
        eid = str(n.element_id)
        nodes.append(_node_to_schema(eid, list(n.labels), dict(n)))
        node_ids.add(eid)

    # --- relationships between the fetched nodes ---
    rel_query = """
        MATCH (a)-[r]->(b)
        WHERE elementId(a) IN $ids AND elementId(b) IN $ids
        RETURN r, elementId(startNode(r)) AS src, elementId(endNode(r)) AS tgt
        LIMIT $limit
    """
    ids_list = list(node_ids)
    rel_result = await session.run(rel_query, {"ids": ids_list, "limit": max_nodes * 5})
    rel_records = [r async for r in rel_result]

    relationships: List[GraphRelationship] = []
    for record in rel_records:
        r = record["r"]
        relationships.append(
            _rel_to_schema(
                str(r.element_id),
                r.type,
                str(record["src"]),
                str(record["tgt"]),
                dict(r),
            )
        )

    # count total nodes in database (separate lightweight query)
    count_result = await session.run("MATCH (n) RETURN count(n) AS total")
    count_rec = await count_result.single()
    total_in_db = count_rec["total"] if count_rec else 0
    is_truncated = total_in_db > max_nodes

    return nodes, relationships, is_truncated
