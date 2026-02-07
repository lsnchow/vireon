/**
 * TypeScript types matching the backend simulation API schemas.
 */

// ── Request ──────────────────────────────────────────────

export interface SimulateBuildingPayload {
  id: string;
  name: string;
  type: string;
  description: string;
  height_m: number;
  cost_estimate: number;
}

export interface SimulateImpactScores {
  environmental_sensitivity: number;
  infrastructure_strain: number;
  livability_proxy: number;
  economic_benefit: number;
  deterministic_acceptance: number;
}

export interface SimulateImpactDrivers {
  d_to_park_m: number;
  d_to_water_m: number;
  overlap_sensitive_m2: number;
  d_to_major_road_m: number;
  d_to_residential_m: number;
  intensity: number;
  center_proximity_score: number;
}

export interface SimulateImpactFlags {
  near_sensitive_zone: boolean;
  near_residential: boolean;
  near_major_road: boolean;
}

export interface SimulateImpactPayload {
  scores: SimulateImpactScores;
  drivers: SimulateImpactDrivers;
  flags: SimulateImpactFlags;
}

export interface SimulateRequest {
  model_id: string;
  building: SimulateBuildingPayload;
  impacts: SimulateImpactPayload;
}

// ── Response: job created ────────────────────────────────

export interface JobCreated {
  job_id: string;
}

// ── Response: status ─────────────────────────────────────

export interface PartialProgress {
  agents_done: number;
  agents_total: number;
}

export interface SimulateStatus {
  status: 'queued' | 'running' | 'complete' | 'error';
  progress: number;
  phase: string;
  message: string;
  partial?: PartialProgress;
}

// ── Response: result ─────────────────────────────────────

export interface DriverCitation {
  driver: string;
  value: number | string;
  effect: 'positive' | 'negative' | 'neutral';
}

export interface AgentReaction {
  agent_id: string;
  display_name: string;
  stance: 'support' | 'neutral' | 'oppose';
  score: number;
  concerns: string[];
  why: string[];
  would_change_mind_if: string[];
  proposed_amendments: string[];
  driver_citations: DriverCitation[];
}

export interface AggregateResult {
  sentiment_score: number;
  final_score: number;
  notes: string[];
}

export interface SimulationMetadata {
  model_id: string;
  run_ms: number;
  created_at: string;
}

export interface SimulateResult {
  impacts: SimulateImpactPayload;
  agents: AgentReaction[];
  aggregate: AggregateResult;
  metadata: SimulationMetadata;
}
