import type { Scenario } from '@/types';

/**
 * Pre-loaded scenarios for demo control.
 * Buildings reference templates by id and are placed around downtown Kingston.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: 'scenario-a',
    name: 'Downtown Core',
    description: 'City Hall + street-level commercial along Princess St.',
    buildings: [
      {
        id: 'sa-1',
        templateId: 'city-hall',
        center: [-76.4808, 44.2298],
        rotation: 0,
        height: 14,
      },
      {
        id: 'sa-2',
        templateId: 'strip-commercial',
        center: [-76.4835, 44.2312],
        rotation: 15,
        height: 8,
      },
      {
        id: 'sa-3',
        templateId: 'heritage-courthouse',
        center: [-76.479, 44.2305],
        rotation: -10,
        height: 15,
      },
    ],
    overlays: { parks: false, sensitiveZones: false, corridors: false },
  },
  {
    id: 'scenario-b',
    name: 'Waterfront District',
    description: 'High-rise condo + arena near the waterfront.',
    buildings: [
      {
        id: 'sb-1',
        templateId: 'condo-tower',
        center: [-76.4775, 44.228],
        rotation: 30,
        height: 55,
      },
      {
        id: 'sb-2',
        templateId: 'leon-centre',
        center: [-76.482, 44.2265],
        rotation: 0,
        height: 25,
      },
    ],
    overlays: { parks: true, sensitiveZones: false, corridors: false },
  },
  {
    id: 'scenario-c',
    name: 'University Quarter',
    description: "Queen's campus expansion with Grant Hall and a new tower.",
    buildings: [
      {
        id: 'sc-1',
        templateId: 'grant-hall',
        center: [-76.495, 44.226],
        rotation: -5,
        height: 18,
      },
      {
        id: 'sc-2',
        templateId: 'condo-tower',
        center: [-76.4935, 44.2275],
        rotation: 45,
        height: 40,
      },
      {
        id: 'sc-3',
        templateId: 'strip-commercial',
        center: [-76.497, 44.225],
        rotation: 0,
        height: 10,
      },
    ],
    overlays: { parks: false, sensitiveZones: true, corridors: false },
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
