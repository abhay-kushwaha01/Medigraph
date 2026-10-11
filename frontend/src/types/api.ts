/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared API Contract Types for MediGraph AI
 * Synchronized with the Python FastAPI backend contract.
 * All field names follow strict camelCase API naming conventions.
 */

export interface GraphNode {
  id: string;
  label: string;
  title?: string;
  properties?: Record<string, any>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  source: string;
  target: string;
  properties?: Record<string, any>;
}

export interface MedicalSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  evidenceStatus?: string;
  properties?: Record<string, any>;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | string;
  evidenceStatus: string;
  sourceIds: string[];
  properties?: Record<string, any>;
}

export interface PatientRequest {
  patientId: string;
  ageGroup: string;
  conditions: string[];
  allergies: string[];
  currentMedications: string[];
}

export interface PatientAnalysisResponse {
  patientId: string;
  findings: Finding[];
  graphNodes: GraphNode[];
  graphRelationships: GraphRelationship[];
  sources: MedicalSource[];
  limitations: string[];
}

export interface GraphResponse {
  graphNodes: GraphNode[];
  graphRelationships: GraphRelationship[];
}

export interface PatientProfile {
  patientId: string;
  ageGroup: string;
  conditions: string[];
  allergies: string[];
  currentMedications: string[];
  properties?: Record<string, any>;
}

export interface HealthResponse {
  status: string;
  database?: string;
  version?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs?: number;
}

export interface ImportRequest {
  dataType: 'patients' | 'graph';
  items: any[];
  validateOnly?: boolean;
}

export interface ImportResponse {
  success: boolean;
  importedCount: number;
  errors?: string[];
  message: string;
  timestamp?: string;
}
