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
    id: 'bldg_eleven_condo',
    name: '11-Story Condominium',
    type: 'residential',
    defaultHeight: 33,
    floors: 11,
    color: TYPE_COLORS.residential,
    description: '11-story residential condominium with modern glass facade.',
    costEstimate: 38000000,
    sketchfabUid: 'c6b0308c2ebb4842ae49aff70ce14ad0',
    footprintShapeId: 'shape_nyc_004',
    footprintMeters: [
      [-22.5, -17.5],
      [22.5, -17.5],
      [22.5, 17.5],
      [-22.5, 17.5],
    ],
  },
  {
    id: 'bldg_warehouse',
    name: 'Industrial Warehouse',
    type: 'industrial',
    defaultHeight: 12,
    floors: 4,
    color: TYPE_COLORS.industrial,
    description: 'Industrial warehouse with high ceilings and freight access.',
    costEstimate: 9500000,
    sketchfabUid: '770acf6b0da74af397f748d95141f8be',
    footprintShapeId: 'shape_nyc_005',
    footprintMeters: [
      [-60, -45],
      [60, -45],
      [60, 45],
      [-60, 45],
    ],
  },
  {
    id: 'bldg_industrial_block',
    name: 'Industrial Block',
    type: 'industrial',
    defaultHeight: 6,
    floors: 2,
    color: TYPE_COLORS.industrial,
    description: 'Low-profile industrial block with modular layout.',
    costEstimate: 4200000,
    sketchfabUid: '168f378f03f24f1280e76c824b3cf7fc',
    footprintShapeId: 'shape_nyc_011',
    footprintMeters: [
      [-30, -7.5],
      [30, -7.5],
      [30, 7.5],
      [-30, 7.5],
    ],
  },
  {
    id: 'bldg_lowrise_industrial',
    name: '2-Story Industrial',
    type: 'residential',
    defaultHeight: 3,
    floors: 2,
    color: TYPE_COLORS.residential,
    description: 'Compact 2-story structure suited for light industrial or residential conversion.',
    costEstimate: 1800000,
    sketchfabUid: '154fb8d55bc144e78f9c19e56637b6a4',
    footprintShapeId: 'shape_nyc_020',
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
    id: 'bldg_midrise_tower',
    name: 'Mid-Rise Tower',
    type: 'mixed_use',
    defaultHeight: 12,
    floors: 4,
    color: TYPE_COLORS.mixed_use,
    description: 'Mid-rise mixed-use tower with ground-floor retail and upper residences.',
    costEstimate: 14000000,
    sketchfabUid: '9e891744efb04f359c88aaed25c0b53f',
    footprintShapeId: 'shape_nyc_010',
    footprintMeters: [
      [-20, -12.5],
      [20, -12.5],
      [20, 12.5],
      [-20, 12.5],
    ],
  },
  {
    id: 'bldg_midrise_res',
    name: 'Mid-Rise Residential',
    type: 'residential',
    defaultHeight: 9,
    floors: 3,
    color: TYPE_COLORS.residential,
    description: 'Mid-rise residential building with courtyard access and transit proximity.',
    costEstimate: 8500000,
    sketchfabUid: '2aaa4c5fb7c24e829973ea4576db41ba',
    footprintShapeId: 'shape_nyc_025',
    footprintMeters: [
      [-20, -12.5],
      [20, -12.5],
      [20, 12.5],
      [-20, 12.5],
    ],
  },
];

export function getBuildingById(id: string): BuildingTemplate | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

/**
 * Get the effective footprint for a building template.
 * Returns the library shape if the footprint library has been loaded and
 * the template has a `footprintShapeId`, otherwise the template's built-in
 * `footprintMeters` fallback.
 */
export function getEffectiveFootprint(
  template: BuildingTemplate,
  getShapeById?: (id: string) => { footprintMeters: [number, number][] } | undefined,
): [number, number][] {
  if (template.footprintShapeId && getShapeById) {
    const shape = getShapeById(template.footprintShapeId);
    if (shape) return shape.footprintMeters;
  }
  return template.footprintMeters;
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
