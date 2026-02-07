"""Pydantic models for API request / response contracts."""

from __future__ import annotations

from typing import List, Optional, Union
from pydantic import BaseModel, Field


# ── Request ──────────────────────────────────────────────

class BuildingPayload(BaseModel):
    id: str
    name: str
    type: str
    description: str = ""
    height_m: float
    cost_estimate: float = 0.0


class ImpactScores(BaseModel):
    environmental_sensitivity: float = 0
    infrastructure_strain: float = 0
    livability_proxy: float = 0
    economic_benefit: float = 0
    deterministic_acceptance: float = 0


class ImpactDrivers(BaseModel):
    d_to_park_m: float = Field(default=9999, description="Distance to nearest park (m)")
    d_to_water_m: float = Field(default=9999, description="Distance to nearest waterway (m)")
    overlap_sensitive_m2: float = 0
    d_to_major_road_m: float = Field(default=9999)
    d_to_residential_m: float = Field(default=9999)
    intensity: float = 0
    center_proximity_score: float = 0


class ImpactFlags(BaseModel):
    near_sensitive_zone: bool = False
    near_residential: bool = False
    near_major_road: bool = False


class ImpactPayload(BaseModel):
    scores: ImpactScores
    drivers: ImpactDrivers
    flags: ImpactFlags = Field(default_factory=ImpactFlags)


class SimulateRequest(BaseModel):
    model_id: str
    building: BuildingPayload
    impacts: ImpactPayload


# ── Response ─────────────────────────────────────────────

class JobCreated(BaseModel):
    job_id: str


class PartialProgress(BaseModel):
    agents_done: int = 0
    agents_total: int = 0


class SimulateStatus(BaseModel):
    status: str  # queued | running | complete | error
    progress: int = Field(ge=0, le=100)
    phase: str = ""  # impacts | agents | aggregate
    message: str = ""
    partial: Optional[PartialProgress] = None


class DriverCitation(BaseModel):
    driver: str
    value: Union[float, int, str]
    effect: str  # positive | negative | neutral


class AgentReaction(BaseModel):
    agent_id: str
    display_name: str
    stance: str  # support | neutral | oppose
    score: int = Field(ge=0, le=100)
    concerns: list[str] = Field(default_factory=list)
    why: list[str] = Field(default_factory=list)
    would_change_mind_if: list[str] = Field(default_factory=list)
    proposed_amendments: list[str] = Field(default_factory=list)
    driver_citations: list[DriverCitation] = Field(default_factory=list)


class AggregateResult(BaseModel):
    sentiment_score: float
    final_score: float
    notes: list[str] = Field(default_factory=list)


class SimulationMetadata(BaseModel):
    model_id: str
    run_ms: int = 0
    created_at: str = ""


class SimulateResult(BaseModel):
    impacts: ImpactPayload
    agents: list[AgentReaction]
    aggregate: AggregateResult
    metadata: SimulationMetadata
