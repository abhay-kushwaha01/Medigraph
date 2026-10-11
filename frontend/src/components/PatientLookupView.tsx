/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PatientProfile } from '../types/api';
import { api, ApiError } from '../services/api';
import { SAMPLE_PATIENT_PROFILES } from '../data/mockData';
import {
  UserCheck,
  Search,
  AlertTriangle,
  ArrowRight,
  Activity,
  HeartPulse,
  Pill,
  ShieldAlert,
} from 'lucide-react';

interface PatientLookupViewProps {
  isDemoMode: boolean;
  onOpenConfig: () => void;
  onSelectForAnalysis: (patientId: string) => void;
}

export const PatientLookupView: React.FC<PatientLookupViewProps> = ({
  isDemoMode,
  onOpenConfig,
  onSelectForAnalysis,
}) => {
  const [patientIdInput, setPatientIdInput] = useState<string>('P001');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiErrorObj, setApiErrorObj] = useState<ApiError | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const idToSearch = patientIdInput.trim();
    if (!idToSearch) return;

    setLoading(true);
    setError(null);
    setApiErrorObj(null);
    setProfile(null);

    if (isDemoMode) {
      setTimeout(() => {
        const found = SAMPLE_PATIENT_PROFILES[idToSearch];
        if (found) {
          setProfile(found);
        } else {
          setError(`Patient '${idToSearch}' not found in sample profiles database.`);
        }
        setLoading(false);
      }, 300);
      return;
    }

    try {
      const result = await api.getPatient(idToSearch);
      setProfile(result);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setApiErrorObj(err);
        setError(err.message);
      } else {
        setError(err?.message || 'Failed to fetch patient profile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-teal-700" />
          Patient Record Retrieval
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Query indexed clinical patient profile via{' '}
          <code className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded text-teal-700 font-semibold">
            GET /api/patients/{'{patientId}'}
          </code>
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              required
              value={patientIdInput}
              onChange={(e) => setPatientIdInput(e.target.value)}
              placeholder="Enter patientId (e.g. P001, P002, P003)..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-xs"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Querying...
              </>
            ) : (
              'Fetch Profile'
            )}
          </button>
        </div>

        {/* Quick sample chips */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Quick Lookup:</span>
          {['P001', 'P002', 'P003'].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setPatientIdInput(id);
              }}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono rounded text-xs transition-colors"
            >
              {id}
            </button>
          ))}
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-rose-900">
                Patient Query Unsuccessful
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
              Verify Endpoint
            </button>
          </div>
        </div>
      )}

      {/* Result Profile */}
      {profile && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div>
              <div className="text-xs font-mono font-semibold uppercase text-teal-700">
                Patient Record
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Patient ID: {profile.patientId}
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                Age Demographic: <span className="font-semibold text-slate-700">{profile.ageGroup}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectForAnalysis(profile.patientId)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              Transfer to Knowledge Graph Analysis
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Conditions */}
            <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                <HeartPulse className="w-4 h-4 text-amber-600" />
                Diagnosed Conditions ({profile.conditions?.length || 0})
              </div>
              <div className="space-y-1.5 pt-1">
                {profile.conditions && profile.conditions.length > 0 ? (
                  profile.conditions.map((c, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-xs font-medium text-amber-950"
                    >
                      {c}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No conditions recorded</span>
                )}
              </div>
            </div>

            {/* Allergies */}
            <div className="p-4 bg-rose-50/50 border border-rose-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-semibold text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Documented Allergies ({profile.allergies?.length || 0})
              </div>
              <div className="space-y-1.5 pt-1">
                {profile.allergies && profile.allergies.length > 0 ? (
                  profile.allergies.map((a, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg text-xs font-medium text-rose-950"
                    >
                      {a}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No allergies recorded</span>
                )}
              </div>
            </div>

            {/* Medications */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs">
                <Pill className="w-4 h-4 text-emerald-600" />
                Current Medications ({profile.currentMedications?.length || 0})
              </div>
              <div className="space-y-1.5 pt-1">
                {profile.currentMedications && profile.currentMedications.length > 0 ? (
                  profile.currentMedications.map((m, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-emerald-950"
                    >
                      {m}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No medications recorded</span>
                )}
              </div>
            </div>
          </div>

          {/* Properties */}
          {profile.properties && Object.keys(profile.properties).length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Clinical Metrics & Biomarkers
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(profile.properties).map(([k, v]) => (
                  <div key={k} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">{k}</div>
                    <div className="text-xs font-semibold text-slate-800 mt-0.5">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
