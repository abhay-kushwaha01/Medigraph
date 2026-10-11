/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Network, UserCheck, ShieldCheck, Settings, Wifi, WifiOff, Database } from 'lucide-react';

export type NavTab = 'analysis' | 'graph' | 'patients' | 'import' | 'diagnostics';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isHealthy: boolean | null;
  onOpenConfig: () => void;
  isDemoMode: boolean;
  onToggleDemoMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  isHealthy,
  onOpenConfig,
  isDemoMode,
  onToggleDemoMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Top Notification Banner if Demo Mode is Active */}
      {isDemoMode && (
        <div className="bg-amber-500 text-slate-950 text-xs py-1.5 px-4 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[11px] bg-amber-600 text-white px-2 py-0.5 rounded">
              Sample Mode
            </span>
            <span>
              Displaying offline mock data for evaluation. Real backend requests are paused.
            </span>
          </div>
          <button
            onClick={() => onToggleDemoMode(false)}
            className="text-xs font-semibold underline hover:text-black"
          >
            Switch to Live Backend Mode
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-xs">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 tracking-tight">MediGraph AI</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  FastAPI · Neo4j
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">
                Clinical Knowledge Graph Intelligence Platform
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => onTabChange('analysis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'analysis'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Patient Analysis
            </button>
            <button
              onClick={() => onTabChange('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'graph'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Knowledge Graph
            </button>
            <button
              onClick={() => onTabChange('patients')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'patients'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Patient Lookup
            </button>
            <button
              onClick={() => onTabChange('import')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'import'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Data Ingestion
            </button>
            <button
              onClick={() => onTabChange('diagnostics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'diagnostics'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              API Diagnostics
            </button>
          </nav>

          {/* Backend Status & Settings */}
          <div className="flex items-center gap-3">
            {/* Live Backend Connection Indicator */}
            <button
              onClick={onOpenConfig}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                isHealthy === true
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : isHealthy === false
                  ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Click to configure backend API connection"
            >
              <span className="flex h-2 w-2 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isHealthy === true ? 'bg-emerald-400' : isHealthy === false ? 'bg-rose-400' : 'bg-slate-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isHealthy === true ? 'bg-emerald-500' : isHealthy === false ? 'bg-rose-500' : 'bg-slate-400'
                  }`}
                />
              </span>
              <span className="font-medium">
                {isHealthy === true
                  ? 'FastAPI Online'
                  : isHealthy === false
                  ? 'FastAPI Offline'
                  : 'Checking API...'}
              </span>
              <Settings className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Demo Mode Toggle */}
            <button
              onClick={() => onToggleDemoMode(!isDemoMode)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isDemoMode
                  ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle between real live backend API calls and offline sample data"
            >
              {isDemoMode ? <WifiOff className="w-3 h-3 text-amber-700" /> : <Wifi className="w-3 h-3 text-teal-600" />}
              <span>{isDemoMode ? 'Offline Sample' : 'Live API'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
