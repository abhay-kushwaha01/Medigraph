"""
Graph endpoint schemas.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.patient import CamelModel, GraphNode, GraphRelationship


class GraphResponse(CamelModel):
    graph_nodes: List[GraphNode] = Field(default_factory=list, alias="graphNodes")
    graph_relationships: List[GraphRelationship] = Field(
        default_factory=list, alias="graphRelationships"
    )
    total_nodes: int = Field(0, alias="totalNodes")
    total_relationships: int = Field(0, alias="totalRelationships")
    is_truncated: bool = Field(False, alias="isTruncated")
    message: Optional[str] = None
