/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api, getApiBaseUrl, setApiBaseUrl } from '../services/api';
import { HealthResponse } from '../types/api';
import { CheckCircle2, AlertCircle, RefreshCw, Server, ShieldCheck, ExternalLink, X } from 'lucide-react';

interface BackendConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHealthStatusChanged?: (isHealthy: boolean) => void;
}

export const BackendConfigModal: React.FC<BackendConfigModalProps> = ({
  isOpen,
  onClose,
  onHealthStatusChanged,
}) => {
  const [urlInput, setUrlInput] = useState<string>(getApiBaseUrl());
  const [testing, setTesting] = useState<boolean>(false);
  const [healthResult, setHealthResult] = useState<HealthResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    setTesting(true);
    setTestError(null);
    setHealthResult(null);
    setLatency(null);

    // Save URL to storage
    setApiBaseUrl(urlInput);

    const startTime = performance.now();
    try {
      const result = await api.getHealth();
      const elapsed = Math.round(performance.now() - startTime);
      setLatency(elapsed);
      setHealthResult(result);
      onHealthStatusChanged?.(true);
    } catch (err: any) {
      setTestError(err.message || 'Health check failed');
      onHealthStatusChanged?.(false);
    } finally {
      setTesting(false);
    }
  };

  const handleResetToEnv = () => {
    const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
    setUrlInput(envUrl);
    setApiBaseUrl(envUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-sm font-semibold">Backend API & FastAPI Integration Settings</h2>
              <p className="text-xs text-slate-400">Configure connection to your Python FastAPI backend</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Base URL Configuration */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Backend Base URL (VITE_API_BASE_URL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. http://127.0.0.1:8000"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
              <button
                onClick={handleSaveAndTest}
                disabled={testing}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Save & Test Health'
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
              <span>Defaults to <code>VITE_API_BASE_URL</code> from .env</span>
              <button
                type="button"
                onClick={handleResetToEnv}
                className="text-teal-600 hover:text-teal-800 underline text-xs"
              >
                Reset to default
              </button>
            </div>
          </div>

          {/* Test Health Result */}
          {healthResult && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  FastAPI Backend Connected ({latency}ms)
                </div>
                <span className="font-mono text-[11px] text-emerald-700 font-medium">
                  GET /api/health → 200 OK
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100 font-mono text-xs text-emerald-950">
                <pre className="whitespace-pre-wrap text-[11px]">{JSON.stringify(healthResult, null, 2)}</pre>
              </div>
            </div>
          )}

          {testError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Connection Failed
              </div>
              <p className="text-xs text-rose-700 leading-relaxed font-mono">{testError}</p>
              <div className="text-[11px] text-rose-600 pt-1 border-t border-rose-200/60">
                Check that your FastAPI server is running on the specified URL and has CORS enabled.
              </div>
            </div>
          )}

          {/* API Contract & Security Notice */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Security Architecture:</span>
                <p className="mt-0.5">
                  The frontend communicates purely with your FastAPI backend and never connects directly to Neo4j.
                  Neo4j credentials, passwords, and Cypher queries are securely contained in the Python backend.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 text-slate-300 rounded-xl font-mono text-[11px] space-y-2">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <span>FastAPI CORS Middleware Checklist</span>
              </div>
              <p className="text-slate-400">
                Ensure your FastAPI <code>main.py</code> includes:
              </p>
              <pre className="text-teal-300 bg-slate-950 p-2.5 rounded border border-slate-800 overflow-x-auto">
{`from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Or frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)`}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
