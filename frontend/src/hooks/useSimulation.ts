'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  SimulateRequest,
  SimulateStatus,
  SimulateResult,
  SimulateImpactPayload,
  SimulateBuildingPayload,
} from '@/types/simulation';
import {
  startSimulation,
  pollStatus,
  fetchResult,
  fetchModels,
} from '@/lib/simulate-api';
import type { ImpactResult, PlacedBuilding } from '@/types/map';
import { getBuildingById } from '@/data/buildings';

// ── Types ───────────────────────────────────────────────

export type SimulationPhase = 'idle' | 'running' | 'complete' | 'error';

export interface UseSimulationReturn {
  /** Current lifecycle phase */
  phase: SimulationPhase;
  /** Selected model ID */
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  /** Available models (fetched from backend or fallback) */
  models: string[];
  /** Polling status from backend */
  status: SimulateStatus | null;
  /** Final simulation result */
  result: SimulateResult | null;
  /** Error message if any */
  error: string | null;
  /** Kick off a simulation */
  simulate: (building: PlacedBuilding, impact: ImpactResult) => void;
  /** Reset to idle state */
  reset: () => void;
}

// ── Helpers ──────────────────────────────────────────────

function buildImpactPayload(impact: ImpactResult): SimulateImpactPayload {
  // Map the 5 criteria scores by ID
  const scoreMap: Record<string, number> = {};
  for (const c of impact.criteria) {
    scoreMap[c.id] = c.score;
  }

  // Extract driver values from the flat drivers list
  const driverMap: Record<string, number> = {};
  for (const c of impact.criteria) {
    for (const d of c.drivers) {
      driverMap[d.name] = typeof d.value === 'number' ? d.value : 0;
    }
  }

  return {
    scores: {
      environmental_sensitivity: scoreMap['c1_env'] ?? 0,
      infrastructure_strain: scoreMap['c2_infra'] ?? 0,
      livability_proxy: scoreMap['c3_live'] ?? 0,
      economic_benefit: scoreMap['c4_econ'] ?? 0,
      deterministic_acceptance: impact.overallAcceptance,
    },
    drivers: {
      d_to_park_m: Math.min(driverMap['Distance to nearest park/green'] ?? driverMap['Dist to park'] ?? 500, 1000),
      d_to_water_m: Math.min(driverMap['Distance to nearest waterway'] ?? driverMap['Dist to water'] ?? 500, 1000),
      overlap_sensitive_m2: driverMap['Overlap with sensitive area'] ?? driverMap['Overlap sensitive'] ?? 0,
      d_to_major_road_m: Math.min(driverMap['Distance to major road'] ?? driverMap['Dist to road'] ?? 50, 50),
      d_to_residential_m: Math.min(driverMap['Distance to residential zone'] ?? driverMap['Dist to residential'] ?? 300, 2000),
      intensity: driverMap['Building intensity (area × height)'] ?? driverMap['Intensity'] ?? 0,
      center_proximity_score: driverMap['Centre proximity score'] ?? driverMap['Proximity'] ?? 0,
    },
    flags: {
      near_sensitive_zone:
        (driverMap['Distance to nearest park/green'] ?? 500) < 200 ||
        (driverMap['Distance to nearest waterway'] ?? 500) < 200,
      near_residential: (driverMap['Distance to residential zone'] ?? 300) < 150,
      near_major_road: (driverMap['Distance to major road'] ?? 200) < 100,
    },
  };
}

function buildBuildingPayload(
  placed: PlacedBuilding
): SimulateBuildingPayload | null {
  const template = getBuildingById(placed.templateId);
  if (!template) return null;
  return {
    id: template.id,
    name: template.name,
    type: template.type,
    description: template.description || '',
    height_m: placed.height,
    cost_estimate: template.costEstimate,
  };
}

// ── Hook ─────────────────────────────────────────────────

const POLL_INTERVAL_MS = 500;

export function useSimulation(): UseSimulationReturn {
  const [phase, setPhase] = useState<SimulationPhase>('idle');
  const [selectedModel, setSelectedModel] = useState('amazon/nova-micro-v1');
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<SimulateStatus | null>(null);
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);

  // Fetch available models on mount
  useEffect(() => {
    fetchModels().then(setModels);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setPhase('idle');
    setStatus(null);
    setResult(null);
    setError(null);
    jobIdRef.current = null;
  }, [stopPolling]);

  const simulate = useCallback(
    async (building: PlacedBuilding, impact: ImpactResult) => {
      // Build payloads
      const buildingPayload = buildBuildingPayload(building);
      if (!buildingPayload) {
        setError('Building template not found');
        setPhase('error');
        return;
      }

      const impactPayload = buildImpactPayload(impact);

      const req: SimulateRequest = {
        model_id: selectedModel,
        building: buildingPayload,
        impacts: impactPayload,
      };

      // Reset state
      setPhase('running');
      setStatus(null);
      setResult(null);
      setError(null);
      stopPolling();

      try {
        // Start job
        const { job_id } = await startSimulation(req);
        jobIdRef.current = job_id;

        // Begin polling
        pollRef.current = setInterval(async () => {
          try {
            const s = await pollStatus(job_id);
            setStatus(s);

            if (s.status === 'complete') {
              stopPolling();
              try {
                const r = await fetchResult(job_id);
                setResult(r);
                setPhase('complete');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to fetch result');
                setPhase('error');
              }
            } else if (s.status === 'error') {
              stopPolling();
              setError(s.message || 'Simulation failed');
              setPhase('error');
            }
          } catch {
            // Polling error — keep trying
          }
        }, POLL_INTERVAL_MS);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start simulation');
        setPhase('error');
      }
    },
    [selectedModel, stopPolling]
  );

  return {
    phase,
    selectedModel,
    setSelectedModel,
    models,
    status,
    result,
    error,
    simulate,
    reset,
  };
}
