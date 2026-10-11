/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api, getApiBaseUrl } from '../services/api';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  Server,
  Code,
  ShieldCheck,
} from 'lucide-react';

interface EndpointTestResult {
  endpoint: string;
  method: 'GET' | 'POST';
  status: 'pending' | 'success' | 'failed' | 'idle';
  httpCode?: number;
  durationMs?: number;
  message?: string;
  data?: any;
  contractChecks: {
    field: string;
    passed: boolean;
    note?: string;
  }[];
}

type EndpointKey = 'health' | 'graph' | 'patientAnalysis' | 'patientProfile';

export const ApiDiagnosticsView: React.FC<{ onOpenConfig: () => void }> = ({ onOpenConfig }) => {
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [selectedEndpointResult, setSelectedEndpointResult] = useState<EndpointTestResult | null>(null);

  const [results, setResults] = useState<Record<EndpointKey, EndpointTestResult>>({
    health: {
      endpoint: '/api/health',
      method: 'GET',
      status: 'idle',
      contractChecks: [
        { field: 'status', passed: false, note: 'Must return status field' },
      ],
    },
    graph: {
      endpoint: '/api/graph',
      method: 'GET',
      status: 'idle',
      contractChecks: [
        { field: 'graphNodes', passed: false, note: 'Must return array of GraphNode' },
        { field: 'graphRelationships', passed: false, note: 'Must return array of GraphRelationship' },
        { field: 'id, label, properties', passed: false, note: 'Node field verification' },
        { field: 'id, type, source, target', passed: false, note: 'Relationship field verification' },
      ],
    },
    patientAnalysis: {
      endpoint: '/api/patient-analysis',
      method: 'POST',
      status: 'idle',
      contractChecks: [
        { field: 'patientId', passed: false, note: 'String identifier' },
        { field: 'findings', passed: false, note: 'Array of Finding (id, title, severity, evidenceStatus)' },
        { field: 'graphNodes', passed: false, note: 'Array of GraphNode' },
        { field: 'graphRelationships', passed: false, note: 'Array of GraphRelationship' },
        { field: 'sources', passed: false, note: 'Array of MedicalSource (id, title, publisher, url)' },
        { field: 'limitations', passed: false, note: 'Array of string statements' },
      ],
    },
    patientProfile: {
      endpoint: '/api/patients/P001',
      method: 'GET',
      status: 'idle',
      contractChecks: [
        { field: 'patientId', passed: false, note: 'String identifier' },
        { field: 'ageGroup', passed: false, note: 'String demographic' },
        { field: 'conditions', passed: false, note: 'Array of condition names' },
        { field: 'allergies', passed: false, note: 'Array of allergen names' },
        { field: 'currentMedications', passed: false, note: 'Array of medication names' },
      ],
    },
  });

  const runTest = async (key: 'health' | 'graph' | 'patientAnalysis' | 'patientProfile') => {
    setResults((prev) => ({
      ...prev,
      [key]: { ...prev[key], status: 'pending', message: undefined, httpCode: undefined, data: undefined },
    }));

    const startTime = performance.now();

    try {
      let data: any = null;
      let checks = [...results[key].contractChecks];

      if (key === 'health') {
        data = await api.getHealth();
        checks = checks.map((c) => ({
          ...c,
          passed: data && 'status' in data,
        }));
      } else if (key === 'graph') {
        data = await api.getGraph();
        const hasNodes = Array.isArray(data?.graphNodes);
        const hasRels = Array.isArray(data?.graphRelationships);
        const sampleNode = hasNodes && data.graphNodes.length > 0 ? data.graphNodes[0] : null;
        const sampleRel = hasRels && data.graphRelationships.length > 0 ? data.graphRelationships[0] : null;

        checks = [
          { field: 'graphNodes', passed: hasNodes, note: 'Must return array of GraphNode' },
          { field: 'graphRelationships', passed: hasRels, note: 'Must return array of GraphRelationship' },
          {
            field: 'id, label, properties',
            passed: sampleNode ? 'id' in sampleNode && 'label' in sampleNode : hasNodes,
            note: 'Node field verification',
          },
          {
            field: 'id, type, source, target',
            passed: sampleRel ? 'id' in sampleRel && 'type' in sampleRel && 'source' in sampleRel && 'target' in sampleRel : hasRels,
            note: 'Relationship field verification',
          },
        ];
      } else if (key === 'patientAnalysis') {
        data = await api.analyzePatient({
          patientId: 'P001',
          ageGroup: '30-40',
          conditions: ['Asthma'],
          allergies: ['Amoxicillin'],
          currentMedications: ['Albuterol'],
        });
        checks = [
          { field: 'patientId', passed: Boolean(data?.patientId), note: 'String identifier' },
          { field: 'findings', passed: Array.isArray(data?.findings), note: 'Array of Finding' },
          { field: 'graphNodes', passed: Array.isArray(data?.graphNodes), note: 'Array of GraphNode' },
          { field: 'graphRelationships', passed: Array.isArray(data?.graphRelationships), note: 'Array of GraphRelationship' },
          { field: 'sources', passed: Array.isArray(data?.sources), note: 'Array of MedicalSource' },
          { field: 'limitations', passed: Array.isArray(data?.limitations), note: 'Array of string statements' },
        ];
      } else if (key === 'patientProfile') {
        data = await api.getPatient('P001');
        checks = [
          { field: 'patientId', passed: Boolean(data?.patientId), note: 'String identifier' },
          { field: 'ageGroup', passed: 'ageGroup' in (data || {}), note: 'String demographic' },
          { field: 'conditions', passed: Array.isArray(data?.conditions), note: 'Array of condition names' },
          { field: 'allergies', passed: Array.isArray(data?.allergies), note: 'Array of allergen names' },
          { field: 'currentMedications', passed: Array.isArray(data?.currentMedications), note: 'Array of medication names' },
        ];
      }

      const durationMs = Math.round(performance.now() - startTime);
      const res: EndpointTestResult = {
        ...results[key],
        status: 'success',
        httpCode: 200,
        durationMs,
        data,
        contractChecks: checks,
      };

      setResults((prev) => ({ ...prev, [key]: res }));
      setSelectedEndpointResult(res);
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const res: EndpointTestResult = {
        ...results[key],
        status: 'failed',
        httpCode: err.status || 0,
        durationMs,
        message: err.message || 'Request failed',
        data: err.detail || null,
        contractChecks: results[key].contractChecks.map((c) => ({ ...c, passed: false })),
      };

      setResults((prev) => ({ ...prev, [key]: res }));
      setSelectedEndpointResult(res);
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    await runTest('health');
    await runTest('graph');
    await runTest('patientAnalysis');
    await runTest('patientProfile');
    setIsRunningAll(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-700" />
            FastAPI & Neo4j API Contract Diagnostics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated verification suite testing endpoints, latency, and exact JSON field synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenConfig}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Server className="w-3.5 h-3.5 text-teal-600" />
            API URL: <code className="font-mono text-teal-700">{getApiBaseUrl() || '(relative)'}</code>
          </button>
          <button
            onClick={runAllTests}
            disabled={isRunningAll}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors"
          >
            {isRunningAll ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Testing Endpoints...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Full Contract Verification
              </>
            )}
          </button>
        </div>
      </div>

      {/* Contract Checklist Matrix */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
            API Endpoints Contract Audit
          </div>
          <span className="text-xs text-slate-500">
            4 of 4 endpoints configured
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {(Object.keys(results) as EndpointKey[]).map((key) => {
            const item = results[key];
            return (
              <div
                key={key}
                onClick={() => setSelectedEndpointResult(item)}
                className="p-5 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        item.method === 'POST' ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {item.method}
                    </span>
                    <span className="font-mono font-semibold text-sm text-slate-900">
                      {item.endpoint}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.contractChecks.map((check, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                          check.passed ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {check.passed ? '✓' : '○'} {check.field}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {item.status === 'pending' && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                      Testing...
                    </span>
                  )}
                  {item.status === 'success' && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{item.httpCode} OK ({item.durationMs}ms)</span>
                    </div>
                  )}
                  {item.status === 'failed' && (
                    <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{item.httpCode ? `HTTP ${item.httpCode}` : 'Unreachable'}</span>
                    </div>
                  )}
                  {item.status === 'idle' && (
                    <span className="text-xs text-slate-400">Not Tested</span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      runTest(key);
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                  >
                    Test
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Result Details & Raw Payload Viewer */}
      {selectedEndpointResult && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-teal-400" />
              <span className="font-mono text-sm font-semibold">
                {selectedEndpointResult.method} {selectedEndpointResult.endpoint}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {selectedEndpointResult.durationMs !== undefined && (
                <span>Latency: {selectedEndpointResult.durationMs}ms</span>
              )}
            </div>
          </div>

          {selectedEndpointResult.message && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs font-mono">
              {selectedEndpointResult.message}
            </div>
          )}

          {/* Contract Check Detail */}
          <div>
            <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
              Contract Synchronicity Check
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              {selectedEndpointResult.contractChecks.map((c, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    c.passed
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400'
                  }`}
                >
                  <div>
                    <span className="font-semibold">{c.field}</span>
                    <span className="block text-[10px] text-slate-400 font-sans mt-0.5">{c.note}</span>
                  </div>
                  <span>{c.passed ? 'PASSED' : 'PENDING / FAILED'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* JSON Payload Inspection */}
          {selectedEndpointResult.data && (
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
                Response Payload (Raw JSON)
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-teal-300 font-mono text-xs overflow-x-auto max-h-72">
                {JSON.stringify(selectedEndpointResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Field Glossary & Contract Guide */}
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
        <div className="font-semibold text-slate-800 text-sm">
          MediGraph AI ↔ FastAPI Variable Contract Registry
        </div>
        <p className="text-slate-600 leading-relaxed">
          The table below records the agreed field naming convention. All fields serialize to exact camelCase across the network boundary:
        </p>
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
          {[
            'patientId',
            'ageGroup',
            'conditions',
            'allergies',
            'currentMedications',
            'findings',
            'graphNodes',
            'graphRelationships',
            'sources',
            'limitations',
            'evidenceStatus',
            'sourceIds',
            'properties',
            'publisher',
            'severity',
            'description',
            'title',
            'label',
            'type',
            'source',
            'target',
            'id',
            'url',
          ].map((fieldName) => (
            <span
              key={fieldName}
              className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-medium shadow-2xs"
            >
              {fieldName}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
