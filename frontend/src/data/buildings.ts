import type { BuildingTemplate, BuildingType } from '@/types/map';

/**
 * Color palette for building types.
 */
const TYPE_COLORS: Record<string, [number, number, number]> = {
  civic: [100, 130, 180],
  educational: [180, 160, 130],
  commercial: [140, 150, 160],
  residential: [170, 140, 120],
  mixed_use: [100, 160, 160],
  mixed: [100, 160, 160],
  industrial: [120, 120, 130],
};

/**
 * Convert a GeoJSON Polygon's coordinates (in [lng, lat]) to
 * metre offsets from the polygon centroid.
 */
function geojsonToMeterOffsets(coordinates: number[][][]): {
  footprintMeters: [number, number][];
  centroid: [number, number];
} {
  const ring = coordinates[0]; // outer ring
  // Skip closing vertex if it duplicates the first
  const pts =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;

  // Compute centroid
  let cLng = 0,
    cLat = 0;
  for (const [lng, lat] of pts) {
    cLng += lng;
    cLat += lat;
  }
  cLng /= pts.length;
  cLat /= pts.length;

  // Convert to metre offsets
  const DEG_TO_RAD = Math.PI / 180;
  const METRES_PER_DEG_LAT = 111_320;
  const cosLat = Math.cos(cLat * DEG_TO_RAD);

  const footprintMeters: [number, number][] = pts.map(([lng, lat]) => {
    const mx = (lng - cLng) * METRES_PER_DEG_LAT * cosLat;
    const my = (lat - cLat) * METRES_PER_DEG_LAT;
    return [mx, my];
  });

  return { footprintMeters, centroid: [cLng, cLat] };
}

/**
 * Building library — loaded from public/data/buildings/buildings.json at build time,
 * plus hardcoded defaults for immediate use.
 */
export const BUILDINGS: BuildingTemplate[] = [
  {
    id: 'bldg_city_hall',
    name: 'Kingston City Hall',
    type: 'civic',
    defaultHeight: 14,
    floors: 3,
    color: TYPE_COLORS.civic,
    description: 'Neoclassical civic landmark and municipal government seat in Market Square.',
    costEstimate: 0,
    footprintMeters: [
      [-27.5, -15],
      [27.5, -15],
      [27.5, 15],
      [-27.5, 15],
    ],
  },
  {
    id: 'bldg_grant_hall',
    name: 'Grant Hall',
    type: 'educational',
    defaultHeight: 18,
    floors: 3,
    color: TYPE_COLORS.educational,
    description: "Queen's University assembly hall and campus landmark.",
    costEstimate: 0,
    footprintMeters: [
      [-22.5, -17.5],
      [22.5, -17.5],
      [22.5, 17.5],
      [-22.5, 17.5],
    ],
  },
  {
    id: 'bldg_leon_centre',
    name: "Leon's Centre",
    type: 'commercial',
    defaultHeight: 25,
    floors: 4,
    color: TYPE_COLORS.commercial,
    description: 'Arena / entertainment venue, ~120 m x 90 m.',
    costEstimate: 46000000,
    footprintMeters: [
      [-60, -45],
      [60, -45],
      [60, 45],
      [-60, 45],
    ],
  },
  {
    id: 'bldg_waterfront_tower',
    name: 'Waterfront Tower',
    type: 'residential',
    defaultHeight: 50,
    floors: 15,
    color: TYPE_COLORS.residential,
    description: 'High-rise residential condo tower with lake views.',
    costEstimate: 35000000,
    footprintMeters: [
      [-15, -10],
      [15, -10],
      [15, 10],
      [-15, 10],
    ],
  },
  {
    id: 'bldg_princess_block',
    name: 'Princess St. Block',
    type: 'mixed_use',
    defaultHeight: 8,
    floors: 2,
    color: TYPE_COLORS.mixed_use,
    description: 'Mixed-use street-front commercial with residential above.',
    costEstimate: 5000000,
    footprintMeters: [
      [-30, -7.5],
      [30, -7.5],
      [30, 7.5],
      [-30, 7.5],
    ],
  },
  {
    id: 'bldg_courthouse',
    name: 'Frontenac Courthouse',
    type: 'civic',
    defaultHeight: 15,
    floors: 3,
    color: TYPE_COLORS.civic,
    description: 'L-shaped heritage courthouse, a Frontenac County landmark.',
    costEstimate: 0,
    footprintMeters: [
      [-25, -20],
      [25, -20],
      [25, 0],
      [15, 0],
      [15, 20],
      [-25, 20],
    ],
  },
  {
    id: 'bldg_midrise_a',
    name: 'Midrise Tower A',
    type: 'residential',
    defaultHeight: 38,
    floors: 12,
    color: TYPE_COLORS.residential,
    description: 'Mid-to-high rise mixed-use building with ground-floor retail.',
    costEstimate: 42000000,
    footprintMeters: [
      [-20, -12.5],
      [20, -12.5],
      [20, 12.5],
      [-20, 12.5],
    ],
  },
  {
    id: 'bldg_midrise_b',
    name: 'Midrise Residential B',
    type: 'residential',
    defaultHeight: 22,
    floors: 7,
    color: TYPE_COLORS.residential,
    description: 'Midrise residential building near key amenities and transit.',
    costEstimate: 21000000,
    footprintMeters: [
      [-20, -12.5],
      [20, -12.5],
      [20, 12.5],
      [-20, 12.5],
    ],
  },
  {
    id: 'bldg_commercial_c',
    name: 'Commercial Centre C',
    type: 'commercial',
    defaultHeight: 12,
    floors: 3,
    color: TYPE_COLORS.commercial,
    description: 'Retail/services commercial development near downtown.',
    costEstimate: 8000000,
    footprintMeters: [
      [-20, -10],
      [20, -10],
      [20, 10],
      [-20, 10],
    ],
  },
];

export function getBuildingById(id: string): BuildingTemplate | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

/** Add a custom building template at runtime */
export function addBuildingTemplate(template: BuildingTemplate): void {
  BUILDINGS.push(template);
}

/** Building type -> display label & badge colour */
export const TYPE_BADGES: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  civic: { label: 'Civic', bg: 'bg-blue-900/50', text: 'text-blue-300' },
  educational: { label: 'Education', bg: 'bg-amber-900/50', text: 'text-amber-300' },
  commercial: { label: 'Commercial', bg: 'bg-slate-700/50', text: 'text-slate-300' },
  residential: { label: 'Residential', bg: 'bg-orange-900/50', text: 'text-orange-300' },
  mixed_use: { label: 'Mixed Use', bg: 'bg-teal-900/50', text: 'text-teal-300' },
  mixed: { label: 'Mixed Use', bg: 'bg-teal-900/50', text: 'text-teal-300' },
  industrial: { label: 'Industrial', bg: 'bg-gray-700/50', text: 'text-gray-300' },
};
