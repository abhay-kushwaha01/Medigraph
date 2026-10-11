/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PatientRequest,
  PatientAnalysisResponse,
  GraphResponse,
  PatientProfile,
  HealthResponse,
  ImportRequest,
  ImportResponse,
} from '../types/api';

/**
 * Storage key for runtime base URL overrides.
 */
const STORAGE_KEY_API_BASE_URL = 'medigraph_api_base_url';

/**
 * Retrieves the currently configured API base URL.
 * Defaults to VITE_API_BASE_URL if set, or empty string (relative to origin).
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem(STORAGE_KEY_API_BASE_URL);
    if (override && override.trim().length > 0) {
      return override.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
  return envUrl.trim().replace(/\/+$/, '');
}

/**
 * Updates the runtime API base URL (saved to localStorage).
 */
export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    const cleaned = url.trim().replace(/\/+$/, '');
    if (cleaned) {
      localStorage.setItem(STORAGE_KEY_API_BASE_URL, cleaned);
    } else {
      localStorage.removeItem(STORAGE_KEY_API_BASE_URL);
    }
  }
}

/**
 * Custom error class for API failures preserving HTTP status and detail.
 */
export class ApiError extends Error {
  public status: number;
  public detail?: any;
  public endpoint: string;

  constructor(message: string, status: number, detail?: any, endpoint = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.endpoint = endpoint;
  }
}

/**
 * Formats a given endpoint with base URL.
 */
function resolveUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!base) {
    return normalizedEndpoint;
  }
  return `${base}${normalizedEndpoint}`;
}

/**
 * Core HTTP fetch wrapper with standardized error handling.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = resolveUrl(endpoint);

  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail: any = null;
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const text = await response.text();
        if (text) {
          const json = JSON.parse(text);
          errorDetail = json.detail || json.message || json;
          if (typeof errorDetail === 'string') {
            errorMessage = errorDetail;
          } else if (Array.isArray(errorDetail)) {
            // FastAPI validation error array format: [{ loc: [...], msg: "..." }]
            errorMessage = errorDetail
              .map((err) => `${err.loc?.join('.') || 'field'}: ${err.msg}`)
              .join('; ');
          } else if (typeof errorDetail === 'object') {
            errorMessage = JSON.stringify(errorDetail);
          }
        }
      } catch {
        // Fallback to response.statusText if not JSON
      }

      throw new ApiError(errorMessage, response.status, errorDetail, endpoint);
    }

    const data = await response.json();
    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }

    // Network / connection / CORS errors
    const isNetworkErr = err?.name === 'TypeError' || err?.message?.includes('fetch');
    const msg = isNetworkErr
      ? `Cannot reach backend at ${url}. Ensure your Python FastAPI server is running with CORS enabled.`
      : err?.message || 'Unknown network error';

    throw new ApiError(msg, 0, err, endpoint);
  }
}

/**
 * Centralized API Client for MediGraph AI.
 * Strict endpoint paths:
 * - GET  /api/health
 * - GET  /api/graph
 * - POST /api/patient-analysis
 * - GET  /api/patients/{patientId}
 */
export const api = {
  /**
   * Health check endpoint: GET /api/health
   */
  async getHealth(): Promise<HealthResponse> {
    return apiFetch<HealthResponse>('/api/health', {
      method: 'GET',
    });
  },

  /**
   * Knowledge graph endpoint: GET /api/graph
   */
  async getGraph(): Promise<GraphResponse> {
    return apiFetch<GraphResponse>('/api/graph', {
      method: 'GET',
    });
  },

  /**
   * Patient analysis endpoint: POST /api/patient-analysis
   * Sends exact PatientRequest structure:
   * {
   *   patientId: string,
   *   ageGroup: string,
   *   conditions: string[],
   *   allergies: string[],
   *   currentMedications: string[]
   * }
   */
  async analyzePatient(request: PatientRequest): Promise<PatientAnalysisResponse> {
    return apiFetch<PatientAnalysisResponse>('/api/patient-analysis', {
      method: 'POST',
      body: JSON.stringify({
        patientId: request.patientId,
        ageGroup: request.ageGroup,
        conditions: request.conditions || [],
        allergies: request.allergies || [],
        currentMedications: request.currentMedications || [],
      }),
    });
  },

  /**
   * Patient profile retrieval endpoint: GET /api/patients/{patientId}
   */
  async getPatient(patientId: string): Promise<PatientProfile> {
    const encodedId = encodeURIComponent(patientId);
    return apiFetch<PatientProfile>(`/api/patients/${encodedId}`, {
      method: 'GET',
    });
  },

  /**
   * Batch data import endpoint: POST /api/import
   * Supports parsed patient records or graph nodes/relationships.
   */
  async importData(request: ImportRequest): Promise<ImportResponse> {
    return apiFetch<ImportResponse>('/api/import', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};
