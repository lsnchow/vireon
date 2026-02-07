import type { Scenario, OverlayToggles } from '@/types/map';
import { getBuildingById } from '@/data/buildings';
import { uid } from '@/lib/geo';

/**
 * PRD-format scenario definition (from JSON).
 */
export interface ScenarioDefinition {
  scenario_id: string;
  label: string;
  description: string;
  building_id: string;
  anchor_latlng: [number, number]; // [lat, lng] — PRD convention
  rotation_deg: number;
  height_override_m: number | null;
}

/**
 * Convert a PRD-format scenario to the internal Scenario type.
 */
export function prdScenarioToInternal(def: ScenarioDefinition): Scenario | null {
  const template = getBuildingById(def.building_id);
  if (!template) return null;

  return {
    id: def.scenario_id,
    name: def.label,
    description: def.description,
    buildings: [
      {
        id: `${def.scenario_id}-${uid()}`,
        templateId: def.building_id,
        center: [def.anchor_latlng[1], def.anchor_latlng[0]], // flip [lat,lng] -> [lng,lat]
        rotation: def.rotation_deg,
        height: def.height_override_m ?? template.defaultHeight,
      },
    ],
    overlays: { parks: true, waterways: true, residential: true, corridors: true },
  };
}

/**
 * Pre-loaded scenarios — standard format.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: 'scenario-a',
    name: 'Downtown Core',
    description: 'City Hall + street-level commercial along Princess St.',
    buildings: [
      {
        id: 'sa-1',
        templateId: 'bldg_city_hall',
        center: [-76.4808, 44.2298],
        rotation: 0,
        height: 14,
      },
      {
        id: 'sa-2',
        templateId: 'bldg_princess_block',
        center: [-76.4835, 44.2312],
        rotation: 15,
        height: 8,
      },
      {
        id: 'sa-3',
        templateId: 'bldg_courthouse',
        center: [-76.479, 44.2305],
        rotation: -10,
        height: 15,
      },
    ],
    overlays: { parks: false, waterways: false, residential: false, corridors: false },
  },
  {
    id: 'scenario-b',
    name: 'Waterfront District',
    description: 'High-rise condo + arena near the waterfront.',
    buildings: [
      {
        id: 'sb-1',
        templateId: 'bldg_waterfront_tower',
        center: [-76.4775, 44.228],
        rotation: 30,
        height: 55,
      },
      {
        id: 'sb-2',
        templateId: 'bldg_leon_centre',
        center: [-76.482, 44.2265],
        rotation: 0,
        height: 25,
      },
    ],
    overlays: { parks: true, waterways: true, residential: false, corridors: false },
  },
  {
    id: 'scenario-c',
    name: 'University Quarter',
    description: "Queen's campus expansion with Grant Hall and a new tower.",
    buildings: [
      {
        id: 'sc-1',
        templateId: 'bldg_grant_hall',
        center: [-76.495, 44.226],
        rotation: -5,
        height: 18,
      },
      {
        id: 'sc-2',
        templateId: 'bldg_midrise_a',
        center: [-76.4935, 44.2275],
        rotation: 45,
        height: 40,
      },
      {
        id: 'sc-3',
        templateId: 'bldg_princess_block',
        center: [-76.497, 44.225],
        rotation: 0,
        height: 10,
      },
    ],
    overlays: { parks: false, waterways: false, residential: true, corridors: false },
  },
  // PRD scenarios (single-building demo scenarios)
  {
    id: 'scenario_a_controversial',
    name: 'Controversial',
    description: 'High-rise near parks and waterfront — high environmental sensitivity.',
    buildings: [
      {
        id: 'prd-a-1',
        templateId: 'bldg_midrise_a',
        center: [-76.4760, 44.2280],
        rotation: 15,
        height: 45,
      },
    ],
    overlays: { parks: true, waterways: true, residential: true, corridors: true },
  },
  {
    id: 'scenario_b_mitigated',
    name: 'Mitigated',
    description: 'Same building moved away from sensitive zones and reduced in height.',
    buildings: [
      {
        id: 'prd-b-1',
        templateId: 'bldg_midrise_a',
        center: [-76.4842, 44.2314],
        rotation: 15,
        height: 30,
      },
    ],
    overlays: { parks: true, waterways: true, residential: true, corridors: true },
  },
  {
    id: 'scenario_c_stress',
    name: 'Stress Test',
    description: 'Extreme intensity: tallest building in the densest residential area.',
    buildings: [
      {
        id: 'prd-c-1',
        templateId: 'bldg_waterfront_tower',
        center: [-76.4960, 44.2300],
        rotation: 45,
        height: 80,
      },
    ],
    overlays: { parks: true, waterways: true, residential: true, corridors: true },
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
