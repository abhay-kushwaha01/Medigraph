"""
GET /api/graph — retrieve the knowledge graph from Neo4j.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from neo4j import AsyncSession

from app.database import get_db, is_connected
from app.schemas.graph import GraphResponse
from app.services.graph_service import get_graph

router = APIRouter()


@router.get(
    "/graph",
    response_model=GraphResponse,
    response_model_by_alias=True,
    summary="Retrieve knowledge graph nodes and relationships",
    tags=["Graph"],
)
async def get_graph_endpoint(
    limit: Optional[int] = Query(
        None,
        ge=1,
        le=1000,
        description="Maximum number of nodes to return (default: 200, max: 1000).",
    ),
    session: AsyncSession = Depends(get_db),
) -> GraphResponse:
    """
    Returns all nodes and the relationships between them up to *limit*.

    - Returns an empty graph when the database is empty — never fabricates data.
    - `isTruncated` is true when more nodes exist in the database than were returned.
    """
    if not is_connected():
        raise HTTPException(
            status_code=503,
            detail="Neo4j database is not connected. Check /api/health for details.",
        )

    try:
        nodes, relationships, is_truncated = await get_graph(session, limit)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Graph retrieval error: {type(exc).__name__}",
        )

    msg = None
    if not nodes:
        msg = (
            "The graph is empty. Upload medical data via POST /api/imports/upload "
            "to populate the knowledge graph."
        )
    elif is_truncated:
        msg = f"Results truncated to {len(nodes)} nodes. Use the 'limit' parameter to adjust."

    return GraphResponse(
        graph_nodes=nodes,
        graph_relationships=relationships,
        total_nodes=len(nodes),
        total_relationships=len(relationships),
        is_truncated=is_truncated,
        message=msg,
    )
