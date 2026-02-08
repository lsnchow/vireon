/**
 * Deterministic Impact Engine for CivicLens.
 *
 * Five criteria, all computed from:
 *  - building footprint polygon + placement transform
 *  - building metadata (height, cost, type)
 *  - city layers (GeoJSON)
 *
 * No LLM or network calls.  Every score is traceable to a formula.
 */

import {
  haversineDistance,
  minDistanceToFeatures,
  polygonAreaM2,
  polygonCentroid,
  type FeatureCollection,
} from './geo-analysis';
import { getTransformedFootprint } from './geo';
import type {
  CriterionResult,
  ImpactDriver,
  ImpactResult,
  MitigationResult,
} from '@/types/map';

/* ── Hardcoded centre-of-gravity points for Kingston ── */
const CENTERS: { name: string; lngLat: [number, number] }[] = [
  { name: 'Downtown Core', lngLat: [-76.481, 44.231] },
  { name: "Queen's University", lngLat: [-76.495, 44.225] },
  { name: 'Kingston General Hospital', lngLat: [-76.494, 44.233] },
  { name: 'Transit Hub (Division)', lngLat: [-76.480, 44.230] },
];

/* ── Tuning constants ── */
const K_ENV_PARK = 25;      // sensitivity coefficient for park distance
const K_ENV_WATER = 15;     // sensitivity coefficient for water distance
const K_INFRA_ROAD = 300;   // road-distance denominator for infra strain
const K_LIVE = 120;         // livability coefficient
const K_ECON = 0.003;       // economic benefit decay per metre
const BASE_COST_M2 = 3500;  // $/m² fallback for cost estimate
const EPS = 1;              // avoid division by zero (metres)

/* ── Weight vector for C5 (Public Acceptance) ── */
const W = { benefit: 0.30, env: 0.40, live: 0.15, infra: 0.15 };

/* ── Interfaces ── */
export interface CityLayers {
  parks: FeatureCollection | null;
  waterways: FeatureCollection | null;
  roads: FeatureCollection | null;
  residential: FeatureCollection | null;
}

export interface BuildingInput {
  id: string;
  polygon: [number, number][];   // transformed footprint in [lng, lat]
  height: number;                // metres
  costEstimate?: number;
  type?: string;
  description?: string;
}

/* ══════════════════════════════════════════════════════════
   C1: Environmental Sensitivity (0–100, higher = worse)
   ══════════════════════════════════════════════════════════ */
function computeC1(
  centroid: [number, number],
  layers: CityLayers
): CriterionResult {
  const dPark = layers.parks
    ? minDistanceToFeatures(centroid, layers.parks)
    : Infinity;
  const dWater = layers.waterways
    ? minDistanceToFeatures(centroid, layers.waterways)
    : Infinity;

  // Score increases when distances are small
  const parkTerm = dPark < Infinity ? K_ENV_PARK / (dPark + EPS) : 0;
  const waterTerm = dWater < Infinity ? K_ENV_WATER / (dWater + EPS) : 0;
  const raw = parkTerm + waterTerm;
  const score = Math.min(100, Math.round(raw * 7));

  const drivers: ImpactDriver[] = [
    {
      name: 'Distance to nearest park/green',
      value: Math.round(dPark),
      unit: 'm',
      description:
        dPark < 100
          ? 'Very close to green space — high sensitivity'
          : dPark < 300
          ? 'Moderate proximity to green space'
          : 'Distant from green space — low sensitivity',
    },
    {
      name: 'Distance to nearest waterway',
      value: Math.round(dWater),
      unit: 'm',
      description:
        dWater < 100
          ? 'Adjacent to waterway — high environmental risk'
          : dWater < 500
          ? 'Moderate proximity to waterway'
          : 'Far from waterway — low risk',
    },
  ];

  return {
    id: 'c1_env',
    label: 'Environmental Sensitivity',
    score,
    higherIsWorse: true,
    drivers,
  };
}

/* ══════════════════════════════════════════════════════════
   C2: Infrastructure Strain (0–100, higher = worse)
   ══════════════════════════════════════════════════════════ */
function computeC2(
  centroid: [number, number],
  areaM2: number,
  height: number,
  layers: CityLayers
): CriterionResult {
  const intensity = areaM2 * height;
  const dRoad = layers.roads
    ? minDistanceToFeatures(centroid, layers.roads)
    : 200; // assume moderate if no road data

  // Higher intensity + farther from road => more strain
  const normIntensity = Math.min(1, intensity / 200_000);     // 200k m³ = max reference
  const roadFactor = 1 + Math.min(dRoad, 1000) / K_INFRA_ROAD; // caps at ~4.3×
  const raw = normIntensity * roadFactor;
  const score = Math.min(100, Math.round(raw * 70));

  const drivers: ImpactDriver[] = [
    {
      name: 'Distance to major road',
      value: Math.round(dRoad),
      unit: 'm',
      description:
        dRoad < 50
          ? 'Adjacent to corridor — good infrastructure access'
          : dRoad < 200
          ? 'Near corridor — moderate access'
          : 'Far from major corridor — higher strain',
    },
  ];

  return {
    id: 'c2_infra',
    label: 'Infrastructure Strain',
    score,
    higherIsWorse: true,
    drivers,
  };
}

/* ══════════════════════════════════════════════════════════
   C3: Livability Proxy (0–100, higher = worse)
   ══════════════════════════════════════════════════════════ */
function computeC3(
  centroid: [number, number],
  height: number,
  layers: CityLayers
): CriterionResult {
  const dRes = layers.residential
    ? minDistanceToFeatures(centroid, layers.residential)
    : 500;

  // Taller buildings closer to residential = worse
  const raw = (height / (dRes + EPS)) * K_LIVE;
  const score = Math.min(100, Math.round(raw));

  const drivers: ImpactDriver[] = [
    {
      name: 'Building height',
      value: height,
      unit: 'm',
      description:
        height > 40
          ? 'Tall structure — significant shadow/visual impact'
          : height > 20
          ? 'Medium-rise — moderate visual impact'
          : 'Low-rise — minimal impact',
    },
    {
      name: 'Distance to residential zone',
      value: Math.round(dRes),
      unit: 'm',
      description:
        dRes < 50
          ? 'Adjacent to residential — high intrusion potential'
          : dRes < 200
          ? 'Near residential — moderate intrusion'
          : 'Away from residential areas',
    },
  ];

  return {
    id: 'c3_live',
    label: 'Livability Impact',
    score,
    higherIsWorse: true,
    drivers,
  };
}

/* ══════════════════════════════════════════════════════════
   C4: Economic Benefit / Vitality (0–100, higher = better)
   ══════════════════════════════════════════════════════════ */
function computeC4(
  centroid: [number, number],
  areaM2: number,
  height: number
): CriterionResult {
  const intensity = areaM2 * height;
  const normIntensity = Math.min(1, intensity / 200_000);

  // Proximity boost — sum of exponential decay from each centre
  let proximitySum = 0;
  const centerDistances: { name: string; dist: number }[] = [];

  for (const c of CENTERS) {
    const d = haversineDistance(centroid, c.lngLat);
    proximitySum += Math.exp(-d * K_ECON);
    centerDistances.push({ name: c.name, dist: d });
  }

  // Apply a baseline boost + curve to make scores generally favorable (60+)
  // Buildings inherently create economic activity (jobs, taxes, services)
  const baseline = 0.4; // Guarantees ~40 points minimum
  const raw = baseline + (normIntensity * proximitySum * 1.2); // 1.2x multiplier
  const score = Math.min(100, Math.round(raw * 80)); // Scale up to reach 60-80 range easily

  // Sort to find closest centre
  centerDistances.sort((a, b) => a.dist - b.dist);

  const drivers: ImpactDriver[] = [
    {
      name: `Distance to ${centerDistances[0].name}`,
      value: Math.round(centerDistances[0].dist),
      unit: 'm',
      description:
        centerDistances[0].dist < 300
          ? 'Very close to activity centre — strong benefit'
          : centerDistances[0].dist < 800
          ? 'Near activity centre — moderate benefit'
          : 'Far from activity centres — limited benefit',
    },
    {
      name: 'Proximity factor (all centres)',
      value: parseFloat(proximitySum.toFixed(2)),
      unit: '',
      description: `Sum of decay-weighted proximity to ${CENTERS.length} centres`,
    },
  ];

  return {
    id: 'c4_econ',
    label: 'Economic Benefit',
    score,
    higherIsWorse: false,
    drivers,
  };
}

/* ══════════════════════════════════════════════════════════
   C5: Public Acceptance Index (0–100, higher = better)
   ══════════════════════════════════════════════════════════ */
function computeC5(
  c1: CriterionResult,
  c2: CriterionResult,
  c3: CriterionResult,
  c4: CriterionResult
): CriterionResult {
  // Weighted combination: positive from C4, negative from C1/C2/C3
  const raw =
    W.benefit * c4.score - W.env * c1.score - W.infra * c2.score - W.live * c3.score;

  // Shift to 0-100 range (raw can be ~ -100 to +100)
  // Base of 50 + divisor of 1.5 amplifies differences for a wide spread
  const score = Math.max(0, Math.min(100, Math.round(50 + raw / 1.5)));

  // Identify top 2 drivers (highest absolute contributions)
  const contributions = [
    { name: `Economic benefit (C4: ${c4.score})`, impact: W.benefit * c4.score, positive: true },
    { name: `Env. sensitivity (C1: ${c1.score})`, impact: W.env * c1.score, positive: false },
    { name: `Infra. strain (C2: ${c2.score})`, impact: W.infra * c2.score, positive: false },
    { name: `Livability impact (C3: ${c3.score})`, impact: W.live * c3.score, positive: false },
  ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  const topDrivers: ImpactDriver[] = contributions.slice(0, 2).map((c) => ({
    name: c.name,
    value: parseFloat(c.impact.toFixed(1)),
    unit: 'pts',
    description: c.positive
      ? 'Positive contributor to acceptance'
      : 'Negative contributor to acceptance',
  }));

  return {
    id: 'c5_accept',
    label: 'Public Acceptance',
    score,
    higherIsWorse: false,
    drivers: topDrivers,
  };
}

/* ══════════════════════════════════════════════════════════
   Master computation — all 5 criteria
   ══════════════════════════════════════════════════════════ */
export function computeAllImpacts(
  building: BuildingInput,
  layers: CityLayers
): ImpactResult {
  const centroid = polygonCentroid(building.polygon as number[][]);
  const areaM2 = polygonAreaM2(building.polygon as number[][]);

  const c1 = computeC1(centroid, layers);
  const c2 = computeC2(centroid, areaM2, building.height, layers);
  const c3 = computeC3(centroid, building.height, layers);
  const c4 = computeC4(centroid, areaM2, building.height);
  const c5 = computeC5(c1, c2, c3, c4);

  const cost =
    building.costEstimate && building.costEstimate > 0
      ? building.costEstimate
      : Math.round(areaM2 * building.height * BASE_COST_M2 * 0.01);

  // Top overall drivers across all criteria
  const allDrivers = [...c1.drivers, ...c2.drivers, ...c3.drivers, ...c4.drivers];
  const topDrivers = allDrivers
    .filter((d) => d.value !== Infinity && d.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 3);

  return {
    buildingId: building.id,
    criteria: [c1, c2, c3, c4, c5],
    overallAcceptance: c5.score,
    topDrivers,
    costEstimate: cost,
    grossVolume: Math.round(areaM2 * building.height),
  };
}

/* ══════════════════════════════════════════════════════════
   Mitigation suggestion — grid-search for best nearby location
   ══════════════════════════════════════════════════════════ */

/** Radii (metres) and angular steps for the search grid */
const SEARCH_RADII = [100, 300, 500, 800];
const ANGLE_STEP_DEG = 30; // 12 directions per ring
const DEG_PER_METRE = 1 / 111_320;

export function suggestMitigation(
  building: BuildingInput,
  impacts: ImpactResult,
  layers: CityLayers,
  footprintMeters: [number, number][],
  rotation: number
): MitigationResult | null {
  const currentCenter = polygonCentroid(building.polygon as number[][]) as [number, number];
  const currentScore = impacts.overallAcceptance;
  const beforeScores = impacts.criteria;

  // Helper: build a BuildingInput at a candidate centre
  const buildAt = (center: [number, number]): BuildingInput => {
    const polygon = getTransformedFootprint(footprintMeters, center, rotation);
    return {
      ...building,
      polygon,
    };
  };

  // Evaluate the current position as baseline best
  let bestScore = currentScore;
  let bestCenter: [number, number] = currentCenter;

  // Grid-search: radii × angles
  const cosLat = Math.cos((currentCenter[1] * Math.PI) / 180);

  for (const radius of SEARCH_RADII) {
    for (let angleDeg = 0; angleDeg < 360; angleDeg += ANGLE_STEP_DEG) {
      const angleRad = (angleDeg * Math.PI) / 180;
      const dLng = (radius * Math.cos(angleRad) * DEG_PER_METRE) / cosLat;
      const dLat = radius * Math.sin(angleRad) * DEG_PER_METRE;

      const candidate: [number, number] = [
        currentCenter[0] + dLng,
        currentCenter[1] + dLat,
      ];

      const candidateBuilding = buildAt(candidate);
      const result = computeAllImpacts(candidateBuilding, layers);

      if (result.overallAcceptance > bestScore) {
        bestScore = result.overallAcceptance;
        bestCenter = candidate;
      }
    }
  }

  // Did we find a better location?
  const improved = bestScore > currentScore;
  let newCenter: [number, number] | undefined;
  let newHeight: number | undefined;
  let description: string;

  if (improved) {
    newCenter = bestCenter;
    const distMoved = Math.round(
      haversineDistance(currentCenter, bestCenter)
    );
    description = `Move building ~${distMoved} m to a location with higher acceptance (score ${currentScore} → ${bestScore})`;
  } else {
    // Fallback: reduce height by 20% if no better location found
    newHeight = Math.max(6, Math.round(building.height * 0.8));
    description = `Reduce height from ${building.height} m to ${newHeight} m (−20%) — no better nearby location found`;
  }

  // Compute after-scores for the chosen mitigation
  const mitigatedBuilding: BuildingInput = improved
    ? buildAt(bestCenter)
    : { ...building, height: newHeight! };

  const afterImpacts = computeAllImpacts(mitigatedBuilding, layers);

  return {
    description,
    newCenter,
    newHeight,
    beforeScores,
    afterScores: afterImpacts.criteria,
  };
}
