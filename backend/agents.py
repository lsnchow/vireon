"""Agent archetype definitions and prompt construction.

Each archetype defines a stakeholder persona used to generate grounded
reactions to a proposed building development.  The system prompt enforces
JSON-only output and forbids inventing data.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from schemas import ImpactPayload, BuildingPayload


# ── Archetype dataclass ──────────────────────────────────

@dataclass
class AgentArchetype:
    id: str
    display_name: str
    persona_summary: str
    priorities: list[str]
    weight: float = 1.0  # for aggregate sentiment weighting


# ── The 6 core archetypes ────────────────────────────────

ARCHETYPES: list[AgentArchetype] = [
    AgentArchetype(
        id="student_renter",
        display_name="Marcus Thompson",
        persona_summary=(
            "A 22-year-old Queen's University student renting a basement apartment "
            "near campus.  Works part-time and relies on walking and transit."
        ),
        priorities=["affordability", "walkability", "campus access", "nightlife/noise tolerance"],
    ),
    AgentArchetype(
        id="nearby_homeowner",
        display_name="Patricia Chen",
        persona_summary=(
            "A 58-year-old homeowner who has lived two blocks from the site for 25 years. "
            "Concerned about property values, shadow, and neighbourhood character."
        ),
        priorities=["noise", "shadow/intrusion proxy", "green space protection", "property stability"],
    ),
    AgentArchetype(
        id="environmental_advocate",
        display_name="Sarah Greenfield",
        persona_summary=(
            "An environmental scientist and volunteer with the local conservation "
            "authority.  Focuses on ecological corridors and sensitive habitats."
        ),
        priorities=["sensitive-area risk", "runoff/green buffers", "long-term ecological health"],
    ),
    AgentArchetype(
        id="small_business_owner",
        display_name="David Kowalski",
        persona_summary=(
            "Owns a family bakery on Princess Street for 15 years. Depends on "
            "foot traffic and worries about construction disruption."
        ),
        priorities=["foot traffic", "construction disruption duration", "parking/access"],
    ),
    AgentArchetype(
        id="city_planner",
        display_name="James Rivera",
        persona_summary=(
            "A senior planner with the City of Kingston planning department. "
            "Evaluates developments for balanced community benefit and policy compliance."
        ),
        priorities=["balanced tradeoffs", "corridor access", "context mismatch", "feasibility of mitigations"],
    ),
    AgentArchetype(
        id="accessibility_advocate",
        display_name="Amara Okafor",
        persona_summary=(
            "A disability-rights organiser and wheelchair user.  Champions "
            "universal design and equitable access to services."
        ),
        priorities=["equitable access", "safe mobility", "proximity to services", "inclusive design signals"],
    ),
]


# ── Prompt construction ──────────────────────────────────

_SYSTEM_TEMPLATE = """\
You are {display_name}, {persona_summary}

YOUR PRIORITIES: {priorities}

RULES (non-negotiable):
1. Respond ONLY with a single valid JSON object — no markdown, no commentary, no extra keys.
2. Do NOT invent data, statistics, or cite sources that are not provided.
3. Reference ONLY the building metadata and impact drivers given to you.
4. You MUST include at least 2 entries in "driver_citations".
5. Calibrate your "score" (0-100) as follows:
   0-20 = strong oppose, 20-40 = oppose, 40-60 = mixed/neutral,
   60-80 = support, 80-100 = strong support.
6. Your score MUST be consistent with your stance.

OUTPUT SCHEMA (follow exactly):
{{
  "agent_id": "{agent_id}",
  "display_name": "{display_name}",
  "stance": "support" | "neutral" | "oppose",
  "score": <integer 0-100>,
  "concerns": ["<1-3 short bullets>"],
  "why": ["<2-4 bullets explaining your stance, citing specific driver values>"],
  "would_change_mind_if": ["<1-3 bullets>"],
  "proposed_amendments": ["<1-3 short actionable suggestions>"],
  "driver_citations": [
    {{ "driver": "<driver_key>", "value": <number>, "effect": "positive" | "negative" | "neutral" }},
    ...
  ]
}}
"""

_USER_TEMPLATE = """\
A new development is proposed for Kingston, Ontario.

BUILDING:
- Name: {name}
- Type: {type}
- Description: {description}
- Height: {height_m} m
- Estimated cost: ${cost_estimate:,.0f}

DETERMINISTIC IMPACT SCORES (0-100):
- Environmental Sensitivity: {env} (higher = worse)
- Infrastructure Strain: {infra} (higher = worse)
- Livability Proxy: {live} (higher = worse)
- Economic Benefit: {econ} (higher = better)
- Deterministic Acceptance: {accept}

KEY DRIVERS:
- Distance to nearest park: {d_to_park_m:.0f} m
- Distance to nearest waterway: {d_to_water_m:.0f} m
- Overlap with sensitive area: {overlap_sensitive_m2:.0f} m²
- Distance to major road: {d_to_major_road_m:.0f} m
- Distance to residential zone: {d_to_residential_m:.0f} m
- Building intensity (area×height): {intensity:.0f} m³
- Centre proximity score: {center_proximity_score:.2f}

FLAGS:
- Near sensitive zone: {near_sensitive_zone}
- Near residential: {near_residential}
- Near major road: {near_major_road}

Given your persona and priorities, provide your reaction as the JSON object specified in your instructions.
"""


def build_system_prompt(archetype: AgentArchetype) -> str:
    """Build the system prompt for a given agent archetype.

    Uses .replace() instead of .format() because Backboard/LangChain treats
    single curly braces as template variables.  By using .replace() the {{/}}
    in the JSON schema stay as-is, which LangChain interprets as literal braces.
    """
    return (
        _SYSTEM_TEMPLATE
        .replace("{display_name}", archetype.display_name)
        .replace("{persona_summary}", archetype.persona_summary)
        .replace("{priorities}", ", ".join(archetype.priorities))
        .replace("{agent_id}", archetype.id)
    )


def build_user_message(
    building: BuildingPayload,
    impacts: ImpactPayload,
) -> str:
    """Build the user message containing building + impact facts."""
    return _USER_TEMPLATE.format(
        name=building.name,
        type=building.type,
        description=building.description or "No description provided.",
        height_m=building.height_m,
        cost_estimate=building.cost_estimate,
        env=impacts.scores.environmental_sensitivity,
        infra=impacts.scores.infrastructure_strain,
        live=impacts.scores.livability_proxy,
        econ=impacts.scores.economic_benefit,
        accept=impacts.scores.deterministic_acceptance,
        d_to_park_m=impacts.drivers.d_to_park_m,
        d_to_water_m=impacts.drivers.d_to_water_m,
        overlap_sensitive_m2=impacts.drivers.overlap_sensitive_m2,
        d_to_major_road_m=impacts.drivers.d_to_major_road_m,
        d_to_residential_m=impacts.drivers.d_to_residential_m,
        intensity=impacts.drivers.intensity,
        center_proximity_score=impacts.drivers.center_proximity_score,
        near_sensitive_zone=impacts.flags.near_sensitive_zone,
        near_residential=impacts.flags.near_residential,
        near_major_road=impacts.flags.near_major_road,
    )
