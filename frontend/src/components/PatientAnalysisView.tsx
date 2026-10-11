/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  PatientRequest,
  PatientAnalysisResponse,
} from '../types/api';
import { api, ApiError } from '../services/api';
import { SAMPLE_PATIENT_REQUESTS, SAMPLE_ANALYSIS_RESPONSES } from '../data/mockData';
import { GraphVisualizer } from './GraphVisualizer';
import {
  AlertTriangle,
  FileText,
  ExternalLink,
  Plus,
  X,
  Play,
  RotateCcw,
  Code,
  ShieldAlert,
  BookOpen,
  Info,
  CheckCircle,
} from 'lucide-react';

interface PatientAnalysisViewProps {
  isDemoMode: boolean;
  onOpenConfig: () => void;
  initialPatientId?: string;
}

export const PatientAnalysisView: React.FC<PatientAnalysisViewProps> = ({
  isDemoMode,
  onOpenConfig,
  initialPatientId,
}) => {
  // Form State strictly using the contract fields
  const [patientId, setPatientId] = useState<string>(initialPatientId || 'P001');
  const [ageGroup, setAgeGroup] = useState<string>('30-40');
  const [conditions, setConditions] = useState<string[]>(['Asthma', 'Hypertension']);
  const [allergies, setAllergies] = useState<string[]>(['Amoxicillin', 'Peanuts']);
  const [currentMedications, setCurrentMedications] = useState<string[]>([
    'Albuterol',
    'Lisinopril',
  ]);

  // Sync when initialPatientId changes
  React.useEffect(() => {
    if (initialPatientId && initialPatientId !== patientId) {
      setPatientId(initialPatientId);
      const matched = SAMPLE_PATIENT_REQUESTS.find((p) => p.patientId === initialPatientId);
      if (matched) {
        setAgeGroup(matched.ageGroup);
        setConditions([...matched.conditions]);
        setAllergies([...matched.allergies]);
        setCurrentMedications([...matched.currentMedications]);
      }
    }
  }, [initialPatientId]);

  // Input fields for adding items
  const [newCondition, setNewCondition] = useState<string>('');
  const [newAllergy, setNewAllergy] = useState<string>('');
  const [newMedication, setNewMedication] = useState<string>('');

  // Execution & Response state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiErrorObj, setApiErrorObj] = useState<ApiError | null>(null);
  const [response, setResponse] = useState<PatientAnalysisResponse | null>(null);
  const [showJsonPayload, setShowJsonPayload] = useState<boolean>(false);

  // Helper to load presets
  const loadPreset = (preset: PatientRequest) => {
    setPatientId(preset.patientId);
    setAgeGroup(preset.ageGroup);
    setConditions([...preset.conditions]);
    setAllergies([...preset.allergies]);
    setCurrentMedications([...preset.currentMedications]);
    setError(null);
    setApiErrorObj(null);
  };

  const handleAddCondition = () => {
    if (newCondition.trim() && !conditions.includes(newCondition.trim())) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const handleAddAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const handleAddMedication = () => {
    if (newMedication.trim() && !currentMedications.includes(newMedication.trim())) {
      setCurrentMedications([...currentMedications, newMedication.trim()]);
      setNewMedication('');
    }
  };

  const currentPayload: PatientRequest = {
    patientId: patientId.trim(),
    ageGroup: ageGroup.trim(),
    conditions,
    allergies,
    currentMedications,
  };

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setApiErrorObj(null);
    setResponse(null);

    if (isDemoMode) {
      // Explicit offline demo mode
      setTimeout(() => {
        const mockResult =
          SAMPLE_ANALYSIS_RESPONSES[patientId.trim()] || {
            patientId: patientId.trim(),
            findings: [
              {
                id: 'F-DEMO-01',
                title: 'Potential drug-condition interaction evaluated',
                description: `Analysis for ${patientId} with conditions [${conditions.join(', ')}] and medications [${currentMedications.join(', ')}].`,
                severity: 'moderate',
                evidenceStatus: 'emerging',
                sourceIds: ['SRC-01'],
              },
            ],
            graphNodes: [
              ...currentMedications.map((m, i) => ({
                id: `M-${i}`,
                label: 'Medication',
                title: m,
              })),
              ...conditions.map((c, i) => ({
                id: `C-${i}`,
                label: 'Condition',
                title: c,
              })),
            ],
            graphRelationships: [
              ...(currentMedications.length > 0 && conditions.length > 0
                ? [
                    {
                      id: 'R-DEMO',
                      type: 'EVALUATED_AGAINST',
                      source: 'M-0',
                      target: 'C-0',
                    },
                  ]
                : []),
            ],
            sources: [
              {
                id: 'SRC-01',
                title: 'Clinical Pharmacology Reference Guide',
                publisher: 'Medical Knowledge Network',
                url: 'https://example.com/medical-reference',
                evidenceStatus: 'established',
              },
            ],
            limitations: [
              'Offline demo mode: This is a synthetic preview simulation.',
            ],
          };
        setResponse(mockResult);
        setLoading(false);
      }, 400);
      return;
    }

    try {
      const result = await api.analyzePatient(currentPayload);
      setResponse(result);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setApiErrorObj(err);
        setError(err.message);
      } else {
        setError(err?.message || 'Failed to analyze patient');
      }
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'moderate':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Patient Knowledge Graph Analysis
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Evaluate multi-condition drug interactions, adverse risks, and clinical evidence via{' '}
          <code className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-semibold">
            POST /api/patient-analysis
          </code>
        </p>
      </div>

      {/* Preset Selector */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
        <span className="font-semibold text-slate-700">Quick Test Presets:</span>
        {SAMPLE_PATIENT_REQUESTS.map((preset) => (
          <button
            key={preset.patientId}
            type="button"
            onClick={() => loadPreset(preset)}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
          >
            {preset.patientId} ({preset.conditions.join(', ')})
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setPatientId('P999');
            setAgeGroup('40-50');
            setConditions([]);
            setAllergies([]);
            setCurrentMedications([]);
          }}
          className="ml-auto flex items-center gap-1 text-slate-500 hover:text-slate-800"
        >
          <RotateCcw className="w-3 h-3" />
          Clear Form
        </button>
      </div>

      {/* Main Request Form */}
      <form onSubmit={handleRunAnalysis} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* patientId */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                patientId <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. P001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Unique identifier matching API contract
              </span>
            </div>

            {/* ageGroup */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                ageGroup <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                placeholder="e.g. 30-40"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Demographic bracket (e.g. "30-40", "65-75")
              </span>
            </div>
          </div>

          {/* conditions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              conditions ({conditions.length})
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {conditions.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg font-medium"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
                    className="text-amber-500 hover:text-amber-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {conditions.length === 0 && (
                <span className="text-xs text-slate-400 italic">No conditions added</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCondition();
                  }
                }}
                placeholder="Add condition (e.g. Asthma, Hypertension, T2D)..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddCondition}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* allergies */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              allergies ({allergies.length})
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {allergies.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-lg font-medium"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => setAllergies(allergies.filter((_, i) => i !== idx))}
                    className="text-rose-500 hover:text-rose-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {allergies.length === 0 && (
                <span className="text-xs text-slate-400 italic">No allergies added</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAllergy();
                  }
                }}
                placeholder="Add allergy (e.g. Amoxicillin, Peanuts, Sulfa)..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddAllergy}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* currentMedications */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              currentMedications ({currentMedications.length})
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {currentMedications.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg font-medium"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMedications(currentMedications.filter((_, i) => i !== idx))
                    }
                    className="text-emerald-500 hover:text-emerald-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {currentMedications.length === 0 && (
                <span className="text-xs text-slate-400 italic">No medications added</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMedication();
                  }
                }}
                placeholder="Add medication (e.g. Albuterol, Lisinopril, Warfarin)..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddMedication}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Action & Payload Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setShowJsonPayload(!showJsonPayload)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            <Code className="w-3.5 h-3.5 text-slate-500" />
            {showJsonPayload ? 'Hide' : 'Inspect'} Exact JSON Request
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing Knowledge Graph...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Patient Analysis
              </>
            )}
          </button>
        </div>

        {/* Expandable JSON Payload Inspection */}
        {showJsonPayload && (
          <div className="p-4 bg-slate-950 text-slate-200 border-t border-slate-800 text-xs font-mono">
            <div className="text-[11px] text-slate-400 mb-1">
              POST /api/patient-analysis Payload Contract:
            </div>
            <pre className="text-teal-300 overflow-x-auto p-2 bg-slate-900 rounded">
              {JSON.stringify(currentPayload, null, 2)}
            </pre>
          </div>
        )}
      </form>

      {/* Error State */}
      {error && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-rose-900">
                Patient Analysis Request Failed
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
              Verify Backend URL
            </button>
          </div>
          <p className="text-[11px] text-rose-600 pt-2 border-t border-rose-200">
            Note: Real error details are displayed above. Mock data is never shown upon API failure.
          </p>
        </div>
      )}

      {/* Analysis Results */}
      {response && (
        <div className="space-y-6">
          {/* Result Overview Banner */}
          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-teal-950">
                  Analysis Complete for Patient {response.patientId}
                </h2>
                <p className="text-xs text-teal-800">
                  {response.findings?.length || 0} clinical findings · {response.graphNodes?.length || 0} graph nodes · {response.sources?.length || 0} cited sources
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-teal-800">
              <span className="px-2 py-1 bg-white border border-teal-200 rounded-lg">
                Patient ID: {response.patientId}
              </span>
            </div>
          </div>

          {/* Section 1: Clinical Findings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-teal-700" />
                Clinical Findings ({response.findings?.length || 0})
              </h3>
            </div>

            {(!response.findings || response.findings.length === 0) ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                No adverse interactions or high-risk clinical findings identified for this patient profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {response.findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                          Finding {finding.id}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900">
                          {finding.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-md border ${getSeverityBadge(
                            finding.severity
                          )}`}
                        >
                          {finding.severity} Severity
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                          Evidence: {finding.evidenceStatus}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {finding.description}
                    </p>

                    {/* Linked sources */}
                    {finding.sourceIds && finding.sourceIds.length > 0 && (
                      <div className="pt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">Referenced Sources:</span>
                        {finding.sourceIds.map((srcId) => (
                          <span
                            key={srcId}
                            className="font-mono text-[11px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200"
                          >
                            {srcId}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Properties */}
                    {finding.properties && Object.keys(finding.properties).length > 0 && (
                      <div className="pt-2 mt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        {Object.entries(finding.properties).map(([key, val]) => (
                          <div key={key} className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="font-semibold text-slate-600 capitalize">{key}: </span>
                            <span className="text-slate-800">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Clinical Subgraph */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-700" />
              Patient Graph Context
            </h3>
            <GraphVisualizer
              graphNodes={response.graphNodes || []}
              graphRelationships={response.graphRelationships || []}
              height={440}
              title={`Graph for ${response.patientId}`}
              emptyMessage="No subgraph elements returned for this analysis."
            />
          </div>

          {/* Section 3: Evidence Sources */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-700" />
              Medical Sources ({response.sources?.length || 0})
            </h3>
            {(!response.sources || response.sources.length === 0) ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                No citations returned.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {response.sources.map((src) => (
                  <div
                    key={src.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>{src.id}</span>
                        {src.evidenceStatus && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {src.evidenceStatus}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 line-clamp-2">
                        {src.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">{src.publisher}</p>
                    </div>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-800 font-medium pt-2 border-t border-slate-100"
                      >
                        <ExternalLink className="w-3 h-3" /> View Source
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Clinical Limitations */}
          {response.limitations && response.limitations.length > 0 && (
            <div className="p-5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                <Info className="w-4 h-4 text-amber-700" />
                Clinical Limitations & Guidelines
              </div>
              <ul className="space-y-1.5 text-xs text-amber-800 list-disc list-inside">
                {response.limitations.map((lim, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {lim}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
