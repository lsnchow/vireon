"""Simulation job store and orchestration.

Manages in-memory jobs, fans out agent reactions via Backboard in parallel,
and computes the aggregate sentiment + blended final score.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from config import ALPHA, AGENT_TIMEOUT_S
from schemas import (
    AgentReaction,
    AggregateResult,
    BuildingPayload,
    DriverCitation,
    ImpactPayload,
    SimulateResult,
    SimulationMetadata,
)
from agents import ARCHETYPES, build_system_prompt, build_user_message
from backboard import BackboardClient

log = logging.getLogger(__name__)


# ── Job model ─────────────────────────────────────────────

@dataclass
class Job:
    id: str
    model_id: str
    building: BuildingPayload
    impacts: ImpactPayload
    status: str = "queued"          # queued | running | complete | error
    progress: int = 0               # 0-100
    phase: str = ""                 # impacts | agents | aggregate
    message: str = ""
    agents_done: int = 0
    agents_total: int = 0
    result: Optional[SimulateResult] = None
    error: Optional[str] = None
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    started_at: float = field(default_factory=time.monotonic)


# ── In-memory store ───────────────────────────────────────

_jobs: dict[str, Job] = {}


def create_job(
    model_id: str,
    building: BuildingPayload,
    impacts: ImpactPayload,
) -> Job:
    job = Job(
        id=str(uuid.uuid4()),
        model_id=model_id,
        building=building,
        impacts=impacts,
        agents_total=len(ARCHETYPES),
    )
    _jobs[job.id] = job
    return job


def get_job(job_id: str) -> Optional[Job]:
    return _jobs.get(job_id)


# ── Single-agent execution ────────────────────────────────

def _parse_reaction(
    archetype_id: str,
    display_name: str,
    raw: dict[str, Any],
) -> AgentReaction:
    """Best-effort parse of LLM JSON into an AgentReaction."""
    # Handle parse error fallback
    if raw.get("_parse_error"):
        return AgentReaction(
            agent_id=archetype_id,
            display_name=display_name,
            stance="neutral",
            score=50,
            concerns=["Agent response could not be parsed."],
            why=["Response was not valid JSON."],
            would_change_mind_if=[],
            proposed_amendments=[],
            driver_citations=[],
        )

    citations = []
    for c in raw.get("driver_citations", []):
        try:
            citations.append(DriverCitation(
                driver=str(c.get("driver", "")),
                value=c.get("value", 0),
                effect=str(c.get("effect", "neutral")),
            ))
        except Exception:
            pass

    # Clamp score
    score = max(0, min(100, int(raw.get("score", 50))))

    # Normalise stance
    stance = str(raw.get("stance", "neutral")).lower()
    if stance not in ("support", "neutral", "oppose"):
        stance = "neutral"

    return AgentReaction(
        agent_id=raw.get("agent_id", archetype_id),
        display_name=raw.get("display_name", display_name),
        stance=stance,
        score=score,
        concerns=_str_list(raw.get("concerns")),
        why=_str_list(raw.get("why")),
        would_change_mind_if=_str_list(raw.get("would_change_mind_if")),
        proposed_amendments=_str_list(raw.get("proposed_amendments")),
        driver_citations=citations,
    )


def _str_list(val: Any) -> list[str]:
    if isinstance(val, list):
        return [str(v) for v in val]
    return []


async def _run_single_agent(
    client: BackboardClient,
    archetype_id: str,
    display_name: str,
    system_prompt: str,
    user_message: str,
    model: str,
) -> AgentReaction:
    """Run one agent with timeout and fallback."""
    try:
        raw = await asyncio.wait_for(
            client.one_shot(
                cache_key=archetype_id,
                assistant_name=f"Vireon-{archetype_id}",
                system_prompt=system_prompt,
                user_message=user_message,
                model=model,
            ),
            timeout=AGENT_TIMEOUT_S,
        )
        # #region agent log
        import json as _json, time as _time
        try:
            with open("/Users/lucas/Desktop/Vireon/.cursor/debug.log", "a") as _f:
                _f.write(_json.dumps({"timestamp": int(_time.time()*1000), "location": "simulation.py:_run_single_agent", "message": "agent raw result", "data": {"archetype_id": archetype_id, "has_parse_error": raw.get("_parse_error", False), "raw_keys": list(raw.keys())[:10], "raw_snippet": str(raw.get("_raw", ""))[:300] if raw.get("_parse_error") else "ok"}, "hypothesisId": "H1"}) + "\n")
        except Exception:
            pass
        # #endregion
        return _parse_reaction(archetype_id, display_name, raw)
    except Exception as exc:
        log.warning("Agent %s failed: %s", archetype_id, exc)
        return AgentReaction(
            agent_id=archetype_id,
            display_name=display_name,
            stance="neutral",
            score=50,
            concerns=[f"Agent timed out or failed: {type(exc).__name__}"],
            why=["Could not generate a reaction in time."],
            would_change_mind_if=[],
            proposed_amendments=[],
            driver_citations=[],
        )


# ── Aggregation ───────────────────────────────────────────

def _aggregate(
    reactions: list[AgentReaction],
    deterministic_acceptance: float,
) -> AggregateResult:
    """Compute sentiment + blended final score."""
    if not reactions:
        return AggregateResult(
            sentiment_score=50,
            final_score=deterministic_acceptance,
            notes=["No agent reactions available."],
        )

    total_weight = 0.0
    weighted_sum = 0.0
    for r in reactions:
        # Look up archetype weight (default 1.0)
        arch = next((a for a in ARCHETYPES if a.id == r.agent_id), None)
        w = arch.weight if arch else 1.0
        weighted_sum += r.score * w
        total_weight += w

    sentiment = round(weighted_sum / total_weight, 1) if total_weight else 50.0
    final = round(ALPHA * deterministic_acceptance + (1 - ALPHA) * sentiment, 1)

    # Build explanation notes
    notes = [
        f"Sentiment score: {sentiment:.0f} (weighted avg of {len(reactions)} agents)",
        f"Blended: {ALPHA*100:.0f}% deterministic ({deterministic_acceptance:.0f}) "
        f"+ {(1-ALPHA)*100:.0f}% sentiment ({sentiment:.0f}) = {final:.0f}",
    ]

    # Identify most positive & most negative agent
    sorted_by_score = sorted(reactions, key=lambda r: r.score)
    if sorted_by_score:
        lowest = sorted_by_score[0]
        highest = sorted_by_score[-1]
        notes.append(f"Most critical: {lowest.display_name} ({lowest.score})")
        notes.append(f"Most supportive: {highest.display_name} ({highest.score})")

    return AggregateResult(
        sentiment_score=sentiment,
        final_score=final,
        notes=notes,
    )


# ── Orchestration ─────────────────────────────────────────

async def run_simulation(job: Job) -> None:
    """Execute the full simulation pipeline (called as a background task)."""
    try:
        job.status = "running"

        # Phase 1: Impacts (already computed client-side, just echo)
        job.phase = "impacts"
        job.progress = 15
        job.message = "Processing impact data..."
        await asyncio.sleep(0.1)  # yield to event loop

        # Phase 2: Agent reactions (parallel)
        job.phase = "agents"
        job.progress = 20
        job.message = "Generating stakeholder reactions..."

        client = BackboardClient()
        user_msg = build_user_message(job.building, job.impacts)

        # Create tasks for all agents
        tasks = []
        for arch in ARCHETYPES:
            sys_prompt = build_system_prompt(arch)
            tasks.append(
                _run_single_agent(
                    client=client,
                    archetype_id=arch.id,
                    display_name=arch.display_name,
                    system_prompt=sys_prompt,
                    user_message=user_msg,
                    model=job.model_id,
                )
            )

        # Fan out and collect incrementally
        reactions: list[AgentReaction] = []
        for coro in asyncio.as_completed(tasks):
            reaction = await coro
            reactions.append(reaction)
            job.agents_done = len(reactions)
            # Progress: 20 → 90 linearly as agents complete
            job.progress = 20 + int(70 * len(reactions) / len(ARCHETYPES))
            job.message = f"Agent {len(reactions)}/{len(ARCHETYPES)} complete..."

        # Phase 3: Aggregate
        job.phase = "aggregate"
        job.progress = 92
        job.message = "Aggregating sentiment..."

        aggregate = _aggregate(
            reactions, job.impacts.scores.deterministic_acceptance
        )

        # Build final result
        elapsed_ms = int((time.monotonic() - job.started_at) * 1000)
        job.result = SimulateResult(
            impacts=job.impacts,
            agents=reactions,
            aggregate=aggregate,
            metadata=SimulationMetadata(
                model_id=job.model_id,
                run_ms=elapsed_ms,
                created_at=job.created_at,
            ),
        )

        job.status = "complete"
        job.progress = 100
        job.phase = "complete"
        job.message = "Simulation complete."

    except Exception as exc:
        log.exception("Simulation job %s failed", job.id)
        job.status = "error"
        job.error = str(exc)
        job.message = f"Error: {exc}"
