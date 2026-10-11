/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { PatientAnalysisView } from './components/PatientAnalysisView';
import { GraphExplorerView } from './components/GraphExplorerView';
import { PatientLookupView } from './components/PatientLookupView';
import { ApiDiagnosticsView } from './components/ApiDiagnosticsView';
import { DataImportView } from './components/DataImportView';
import { BackendConfigModal } from './components/BackendConfigModal';
import { api, getApiBaseUrl } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('analysis');
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('P001');

  // Check health on mount
  useEffect(() => {
    let isMounted = true;
    const checkInitialHealth = async () => {
      try {
        await api.getHealth();
        if (isMounted) setIsHealthy(true);
      } catch {
        if (isMounted) setIsHealthy(false);
      }
    };
    checkInitialHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectPatientForAnalysis = (patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveTab('analysis');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isHealthy={isHealthy}
        onOpenConfig={() => setIsConfigOpen(true)}
        isDemoMode={isDemoMode}
        onToggleDemoMode={setIsDemoMode}
      />

      {/* Main Tab Content */}
      <main className="flex-1">
        {activeTab === 'analysis' && (
          <PatientAnalysisView
            isDemoMode={isDemoMode}
            onOpenConfig={() => setIsConfigOpen(true)}
            initialPatientId={selectedPatientId}
          />
        )}

        {activeTab === 'graph' && (
          <GraphExplorerView
            isDemoMode={isDemoMode}
            onOpenConfig={() => setIsConfigOpen(true)}
          />
        )}

        {activeTab === 'patients' && (
          <PatientLookupView
            isDemoMode={isDemoMode}
            onOpenConfig={() => setIsConfigOpen(true)}
            onSelectForAnalysis={handleSelectPatientForAnalysis}
          />
        )}

        {activeTab === 'import' && (
          <DataImportView
            isDemoMode={isDemoMode}
            onOpenConfig={() => setIsConfigOpen(true)}
          />
        )}

        {activeTab === 'diagnostics' && (
          <ApiDiagnosticsView onOpenConfig={() => setIsConfigOpen(true)} />
        )}
      </main>

      {/* Settings Modal */}
      <BackendConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onHealthStatusChanged={setIsHealthy}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">MediGraph AI</span>
            <span>·</span>
            <span>Clinical Knowledge Graph Intelligence</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI Contract v1.0</span>
            <span>·</span>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="text-teal-600 hover:text-teal-800 underline"
            >
              Configure Backend ({getApiBaseUrl() || 'default'})
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
