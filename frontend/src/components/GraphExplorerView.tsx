/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GraphResponse } from '../types/api';
import { api, ApiError } from '../services/api';
import { SAMPLE_GRAPH_DATA } from '../data/mockData';
import { GraphVisualizer } from './GraphVisualizer';
import { Network, RefreshCw, AlertTriangle, Layers, GitFork } from 'lucide-react';

interface GraphExplorerViewProps {
  isDemoMode: boolean;
  onOpenConfig: () => void;
}

export const GraphExplorerView: React.FC<GraphExplorerViewProps> = ({
  isDemoMode,
  onOpenConfig,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiErrorObj, setApiErrorObj] = useState<ApiError | null>(null);
  const [data, setData] = useState<GraphResponse | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchGraph = async () => {
    setLoading(true);
    setError(null);
    setApiErrorObj(null);

    if (isDemoMode) {
      setTimeout(() => {
        setData(SAMPLE_GRAPH_DATA);
        setLastFetched(new Date());
        setLoading(false);
      }, 300);
      return;
    }

    try {
      const response = await api.getGraph();
      setData(response);
      setLastFetched(new Date());
    } catch (err: any) {
      if (err instanceof ApiError) {
        setApiErrorObj(err);
        setError(err.message);
      } else {
        setError(err?.message || 'Failed to retrieve graph data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [isDemoMode]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-teal-700" />
            Medical Knowledge Graph Explorer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Global ontology of clinical relationships, drug mechanisms, and contraindications via{' '}
            <code className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-semibold">
              GET /api/graph
            </code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastFetched && (
            <span className="text-xs text-slate-400">
              Updated: {lastFetched.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchGraph}
            disabled={loading}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Graph
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Knowledge Nodes</div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {data.graphNodes?.length || 0}
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Relationships</div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {data.graphRelationships?.length || 0}
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Data Source</div>
              <div className="text-sm font-semibold text-slate-900">
                {isDemoMode ? 'Offline Test Graph' : 'FastAPI · Neo4j Instance'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-rose-900">
                Failed to Fetch Knowledge Graph
              </h3>
              <p className="text-xs text-rose-700 mt-1 font-mono">{error}</p>
              {apiErrorObj && apiErrorObj.status > 0 && (
                <div className="mt-2 text-xs text-rose-800">
                  HTTP Status: <span className="font-mono font-semibold">{apiErrorObj.status}</span> · Endpoint: <span className="font-mono">{apiErrorObj.endpoint}</span>
                </div>
              )}
            </div>
            <button
              onClick={onOpenConfig}
              className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 rounded-lg text-xs font-medium hover:bg-rose-100"
            >
              Configure API
            </button>
          </div>
          <p className="text-[11px] text-rose-600 pt-2 border-t border-rose-200">
            Real error received from network. Mock data is not displayed.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="h-96 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl">
          <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-700">Loading graph schema & nodes...</p>
          <p className="text-xs text-slate-400 mt-1">Executing GET /api/graph</p>
        </div>
      )}

      {/* Graph Visualizer */}
      {!loading && data && (
        <GraphVisualizer
          graphNodes={data.graphNodes || []}
          graphRelationships={data.graphRelationships || []}
          height={620}
          title="Clinical Knowledge Graph"
          emptyMessage="No nodes or relationships in knowledge graph."
        />
      )}
    </div>
  );
};
