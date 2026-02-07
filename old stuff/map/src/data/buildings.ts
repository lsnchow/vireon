import type { BuildingTemplate } from '@/types';

/**
 * Building library — 6 approximate Kingston-scale footprints.
 * Coordinates are [x, y] metre offsets from centre (east, north positive).
 */
export const BUILDINGS: BuildingTemplate[] = [
  {
    id: 'city-hall',
    name: 'Kingston City Hall',
    type: 'civic',
    defaultHeight: 14,
    floors: 3,
    color: [100, 130, 180],
    description: 'Neoclassical civic landmark, ~55 m × 30 m',
    footprintMeters: [
      [-27.5, -15],
      [27.5, -15],
      [27.5, 15],
      [-27.5, 15],
    ],
  },
  {
    id: 'grant-hall',
    name: 'Grant Hall',
    type: 'educational',
    defaultHeight: 18,
    floors: 3,
    color: [180, 160, 130],
    description: "Queen's University assembly hall, ~45 m × 35 m",
    footprintMeters: [
      [-22.5, -17.5],
      [22.5, -17.5],
      [22.5, 17.5],
      [-22.5, 17.5],
    ],
  },
  {
    id: 'leon-centre',
    name: "Leon's Centre",
    type: 'commercial',
    defaultHeight: 25,
    floors: 4,
    color: [140, 150, 160],
    description: 'Arena / entertainment venue, ~120 m × 90 m',
    footprintMeters: [
      [-60, -45],
      [60, -45],
      [60, 45],
      [-60, 45],
    ],
  },
  {
    id: 'condo-tower',
    name: 'Waterfront Tower',
    type: 'residential',
    defaultHeight: 50,
    floors: 15,
    color: [170, 140, 120],
    description: 'Residential condo tower, ~30 m × 20 m',
    footprintMeters: [
      [-15, -10],
      [15, -10],
      [15, 10],
      [-15, 10],
    ],
  },
  {
    id: 'strip-commercial',
    name: 'Princess St. Block',
    type: 'mixed',
    defaultHeight: 8,
    floors: 2,
    color: [100, 160, 160],
    description: 'Mixed-use street-front commercial, ~60 m × 15 m',
    footprintMeters: [
      [-30, -7.5],
      [30, -7.5],
      [30, 7.5],
      [-30, 7.5],
    ],
  },
  {
    id: 'heritage-courthouse',
    name: 'Frontenac Courthouse',
    type: 'civic',
    defaultHeight: 15,
    floors: 3,
    color: [130, 120, 150],
    description: 'L-shaped heritage courthouse, ~50 m × 40 m + 30 m × 20 m wing',
    // L-shape: main block bottom-left, wing extends right-top
    footprintMeters: [
      [-25, -20],
      [25, -20],
      [25, 0],
      [15, 0],
      [15, 20],
      [-25, 20],
    ],
  },
];

export function getBuildingById(id: string): BuildingTemplate | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

/** Building type → display label & badge colour */
export const TYPE_BADGES: Record<
  BuildingTemplate['type'],
  { label: string; bg: string; text: string }
> = {
  civic: { label: 'Civic', bg: 'bg-blue-900/50', text: 'text-blue-300' },
  educational: { label: 'Education', bg: 'bg-amber-900/50', text: 'text-amber-300' },
  commercial: { label: 'Commercial', bg: 'bg-slate-700/50', text: 'text-slate-300' },
  residential: { label: 'Residential', bg: 'bg-orange-900/50', text: 'text-orange-300' },
  mixed: { label: 'Mixed Use', bg: 'bg-teal-900/50', text: 'text-teal-300' },
  industrial: { label: 'Industrial', bg: 'bg-gray-700/50', text: 'text-gray-300' },
};
