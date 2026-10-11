/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GraphNode, GraphRelationship } from '../types/api';
import { ZoomIn, ZoomOut, RotateCcw, Info, Filter, Search } from 'lucide-react';

interface GraphVisualizerProps {
  graphNodes: GraphNode[];
  graphRelationships: GraphRelationship[];
  height?: number;
  title?: string;
  emptyMessage?: string;
}

interface SimulatedNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  graphNodes = [],
  graphRelationships = [],
  height = 500,
  title,
  emptyMessage = 'No graph nodes or relationships found.',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphRelationship | null>(null);
  const [activeLabelFilter, setActiveLabelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Extract unique labels
  const availableLabels = useMemo(() => {
    const labels = new Set<string>();
    graphNodes.forEach((node) => {
      if (node.label) labels.add(node.label);
    });
    return Array.from(labels);
  }, [graphNodes]);

  // Color generator based on node label
  const getNodeColor = (label: string): { bg: string; border: string; text: string; fill: string } => {
    switch (label?.toLowerCase()) {
      case 'medication':
      case 'drug':
        return { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', fill: '#10b981' };
      case 'condition':
      case 'disease':
        return { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700', fill: '#f59e0b' };
      case 'allergy':
        return { bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-700', fill: '#f43f5e' };
      case 'gene':
      case 'protein':
        return { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-700', fill: '#6366f1' };
      case 'patient':
        return { bg: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-700', fill: '#0284c7' };
      default:
        return { bg: 'bg-slate-50', border: 'border-slate-500', text: 'text-slate-700', fill: '#64748b' };
    }
  };

  // Node position simulation
  const [nodes, setNodes] = useState<SimulatedNode[]>([]);

  useEffect(() => {
    if (!graphNodes || graphNodes.length === 0) {
      setNodes([]);
      return;
    }

    const width = 800;
    const simHeight = height;
    const centerX = width / 2;
    const centerY = simHeight / 2;
    const count = graphNodes.length;

    // Initialize circular positions
    const initialNodes: SimulatedNode[] = graphNodes.map((gn, index) => {
      const angle = (index / (count || 1)) * 2 * Math.PI;
      const radiusDist = count > 1 ? Math.min(width, simHeight) * 0.35 : 0;
      return {
        ...gn,
        x: centerX + radiusDist * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y: centerY + radiusDist * Math.sin(angle) + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        radius: 26,
      };
    });

    // Run simple spring-electrical force iterations
    let sim = [...initialNodes];
    const iterations = 45;
    for (let iter = 0; iter < iterations; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < sim.length; i++) {
        for (let j = i + 1; j < sim.length; j++) {
          const dx = sim[j].x - sim[i].x;
          const dy = sim[j].y - sim[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 220) {
            const force = (220 - dist) / dist;
            sim[i].x -= dx * force * 0.08;
            sim[i].y -= dy * force * 0.08;
            sim[j].x += dx * force * 0.08;
            sim[j].y += dy * force * 0.08;
          }
        }
      }

      // Attraction along relationships
      graphRelationships.forEach((rel) => {
        const srcNode = sim.find((n) => n.id === rel.source);
        const tgtNode = sim.find((n) => n.id === rel.target);
        if (srcNode && tgtNode) {
          const dx = tgtNode.x - srcNode.x;
          const dy = tgtNode.y - srcNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desired = 140;
          const force = (dist - desired) * 0.04;
          srcNode.x += (dx / dist) * force;
          srcNode.y += (dy / dist) * force;
          tgtNode.x -= (dx / dist) * force;
          tgtNode.y -= (dy / dist) * force;
        }
      });

      // Gravity towards center
      sim.forEach((n) => {
        n.x += (centerX - n.x) * 0.02;
        n.y += (centerY - n.y) * 0.02;
      });
    }

    setNodes(sim);
  }, [graphNodes, graphRelationships, height]);

  // Handle Drag & Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'circle' || (e.target as HTMLElement).tagName === 'text') {
      return;
    }
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: mouseX, y: mouseY } : n))
      );
      return;
    }

    if (isDraggingCanvas) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const matchesLabel = activeLabelFilter === 'ALL' || node.label === activeLabelFilter;
      const matchesSearch =
        !searchQuery ||
        (node.title || node.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLabel && matchesSearch;
    });
  }, [nodes, activeLabelFilter, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    return graphRelationships.filter(
      (rel) => filteredNodeIds.has(rel.source) && filteredNodeIds.has(rel.target)
    );
  }, [graphRelationships, filteredNodeIds]);

  if (!graphNodes || graphNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 border border-slate-200 rounded-xl">
        <Info className="w-8 h-8 text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-700">{emptyMessage}</p>
        <p className="text-xs text-slate-500 mt-1">Graph nodes will appear here when loaded from the API.</p>
      </div>
    );
  }

  return (
    <div className="relative border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
      {/* Top control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          {title && <span className="font-semibold text-slate-800">{title}</span>}
          <span className="text-slate-500">
            {graphNodes.length} nodes · {graphRelationships.length} relationships
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search node..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Label Filter */}
          {availableLabels.length > 0 && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5">
              <Filter className="w-3 h-3 text-slate-400 ml-1.5" />
              <button
                onClick={() => setActiveLabelFilter('ALL')}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  activeLabelFilter === 'ALL' ? 'bg-slate-800 text-white font-medium' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              {availableLabels.map((lbl) => (
                <button
                  key={lbl}
                  onClick={() => setActiveLabelFilter(lbl)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    activeLabelFilter === lbl ? 'bg-slate-800 text-white font-medium' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5">
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              title="Zoom In"
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              title="Zoom Out"
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetView}
              title="Reset View"
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`w-full overflow-hidden select-none bg-slate-950/2 relative ${
          isDraggingCanvas ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ height }}
      >
        <svg className="w-full h-full" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="24"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="8"
              markerHeight="6"
              refX="24"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#0f766e" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Relationships (Edges) */}
            {filteredEdges.map((rel) => {
              const srcNode = nodes.find((n) => n.id === rel.source);
              const tgtNode = nodes.find((n) => n.id === rel.target);
              if (!srcNode || !tgtNode) return null;

              const isSelected = selectedEdge?.id === rel.id;
              const midX = (srcNode.x + tgtNode.x) / 2;
              const midY = (srcNode.y + tgtNode.y) / 2;

              return (
                <g key={rel.id} className="cursor-pointer" onClick={() => setSelectedEdge(rel)}>
                  <line
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke={isSelected ? '#0f766e' : '#cbd5e1'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    markerEnd={isSelected ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                  />
                  {/* Relationship label */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-38"
                      y="-9"
                      width="76"
                      height="16"
                      rx="3"
                      fill="#ffffff"
                      stroke={isSelected ? '#0f766e' : '#e2e8f0'}
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[9px] font-mono font-medium fill-slate-600"
                    >
                      {rel.type.length > 12 ? `${rel.type.slice(0, 11)}…` : rel.type}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((node) => {
              const colors = getNodeColor(node.label);
              const isSelected = selectedNode?.id === node.id;
              const displayName = node.title || node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingNodeId(node.id);
                  }}
                  onClick={() => {
                    setSelectedNode(node);
                    setSelectedEdge(null);
                  }}
                >
                  {/* Pulse ring for selected */}
                  {isSelected && (
                    <circle r={node.radius + 6} fill="none" stroke="#0d9488" strokeWidth="2" strokeDasharray="3,3" />
                  )}

                  {/* Outer circle */}
                  <circle
                    r={node.radius}
                    fill="#ffffff"
                    stroke={colors.fill}
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all hover:scale-105"
                  />

                  {/* Inner label badge icon / letter */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    y="-4"
                    fill={colors.fill}
                    className="text-[11px] font-bold select-none"
                  >
                    {node.label.charAt(0).toUpperCase()}
                  </text>

                  {/* Node label */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    y="7"
                    fill="#64748b"
                    className="text-[8px] font-medium uppercase tracking-wider select-none"
                  >
                    {node.label.slice(0, 5)}
                  </text>

                  {/* Title underneath */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    y={node.radius + 5}
                    className="text-[11px] font-medium fill-slate-800 select-none drop-shadow-xs"
                  >
                    {displayName.length > 15 ? `${displayName.slice(0, 14)}…` : displayName}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs border border-slate-200 rounded-lg p-2 text-xs shadow-xs">
          <div className="font-semibold text-[11px] text-slate-700 mb-1">Node Legend</div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Medication</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Condition</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Allergy</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              <span>Gene / Pathway</span>
            </div>
          </div>
        </div>

        {/* Node/Edge Inspector Sidebar Drawer */}
        {(selectedNode || selectedEdge) && (
          <div className="absolute top-3 right-3 w-72 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-lg text-xs max-h-[85%] overflow-y-auto z-10">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
              <span className="font-semibold text-slate-800">
                {selectedNode ? 'Node Details' : 'Relationship Details'}
              </span>
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {selectedNode && (
              <div className="space-y-2">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Node ID</div>
                  <div className="font-mono text-slate-900 font-semibold">{selectedNode.id}</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Label</div>
                  <div className="text-slate-800 font-medium">{selectedNode.label}</div>
                </div>

                {selectedNode.title && (
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Title</div>
                    <div className="text-slate-800">{selectedNode.title}</div>
                  </div>
                )}

                {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium mb-1">Properties</div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-[11px] space-y-1">
                      {Object.entries(selectedNode.properties).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-slate-500">{k}:</span>
                          <span className="text-slate-900 font-medium text-right">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected edges */}
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium mb-1">Connected Relationships</div>
                  <div className="space-y-1">
                    {graphRelationships
                      .filter((r) => r.source === selectedNode.id || r.target === selectedNode.id)
                      .map((r) => (
                        <div
                          key={r.id}
                          onClick={() => setSelectedEdge(r)}
                          className="p-1.5 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer text-[10px]"
                        >
                          <span className="font-mono font-semibold text-teal-700">{r.type}</span>
                          <div className="text-slate-500">
                            {r.source === selectedNode.id ? `→ ${r.target}` : `← ${r.source}`}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {selectedEdge && (
              <div className="space-y-2">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Relationship ID</div>
                  <div className="font-mono text-slate-900 font-semibold">{selectedEdge.id}</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Type</div>
                  <div className="font-mono font-semibold text-teal-700">{selectedEdge.type}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Source</div>
                    <div className="font-mono text-slate-800">{selectedEdge.source}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Target</div>
                    <div className="font-mono text-slate-800">{selectedEdge.target}</div>
                  </div>
                </div>

                {selectedEdge.properties && Object.keys(selectedEdge.properties).length > 0 && (
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium mb-1">Properties</div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-[11px] space-y-1">
                      {Object.entries(selectedEdge.properties).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-slate-500">{k}:</span>
                          <span className="text-slate-900 font-medium text-right">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
