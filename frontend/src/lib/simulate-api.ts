/**
 * API client for the Vireon simulation backend (FastAPI).
 */

import type {
  SimulateRequest,
  JobCreated,
  SimulateStatus,
  SimulateResult,
} from '@/types/simulation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * POST /api/simulate — start a simulation job.
 */
export async function startSimulation(
  req: SimulateRequest
): Promise<JobCreated> {
  const res = await fetch(`${API_BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Simulation start failed (${res.status})`);
  }

  return res.json();
}

/**
 * GET /api/simulate/{jobId}/status — poll progress.
 */
export async function pollStatus(jobId: string): Promise<SimulateStatus> {
  const res = await fetch(`${API_BASE}/api/simulate/${jobId}/status`);

  if (!res.ok) {
    throw new Error(`Status poll failed (${res.status})`);
  }

  return res.json();
}

/**
 * GET /api/simulate/{jobId}/result — fetch final payload.
 */
export async function fetchResult(jobId: string): Promise<SimulateResult> {
  const res = await fetch(`${API_BASE}/api/simulate/${jobId}/result`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Result fetch failed (${res.status})`);
  }

  return res.json();
}

/**
 * GET /api/models — fetch the allowed model list.
 */
export async function fetchModels(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/models`);
    if (res.ok) {
      const data = await res.json();
      return data.models || [];
    }
  } catch {
    /* backend might not be running */
  }
  // Fallback hardcoded list
  return [
    'amazon/nova-micro-v1',
    'amazon/nova-lite-v1',
    'anthropic/claude-3-haiku',
    'anthropic/claude-3.5-sonnet',
    'gemini-2.0-flash-lite-001',
    'gemini-2.0-flash',
    'meta/llama-3.1-8b-instruct',
    'mistral/mistral-small-latest',
  ];
}
