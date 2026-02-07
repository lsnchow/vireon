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
    sketchfabUid: '5303dd0b15304264ac649ba248a1871c', // Post Office Bugojno
    footprintShapeId: 'shape_nyc_001', // 40pts, 48x42m complex civic shape
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
    sketchfabUid: 'c6b0308c2ebb4842ae49aff70ce14ad0', // Modern Office Building
    footprintShapeId: 'shape_nyc_004', // 32pts, 47x48m campus building shape
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
    sketchfabUid: '770acf6b0da74af397f748d95141f8be', // Industrial Building
    footprintShapeId: 'shape_nyc_005', // 84pts, 82x69m large complex arena
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
    sketchfabUid: '147b38a4cc1149f3af52734e0d581866', // High-Rise Office Building Raduga
    footprintShapeId: 'shape_nyc_015', // 22pts, 36x36m tower footprint
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
    sketchfabUid: '168f378f03f24f1280e76c824b3cf7fc', // Modern Low-Rise Condo 1
    footprintShapeId: 'shape_nyc_011', // 21pts, 31x75m elongated street block
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
    sketchfabUid: '154fb8d55bc144e78f9c19e56637b6a4', // Modular Industrial Building
    footprintShapeId: 'shape_nyc_020', // 19pts, 47x62m irregular civic shape
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
    sketchfabUid: '9e891744efb04f359c88aaed25c0b53f', // Low-Rise Modern Condo 3
    footprintShapeId: 'shape_nyc_010', // 10pts, 30x26m clean tower shape
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
    sketchfabUid: '2aaa4c5fb7c24e829973ea4576db41ba', // Low-Rise Modern Condo 2
    footprintShapeId: 'shape_nyc_025', // 19pts, 38x36m residential shape
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
    sketchfabUid: '1ae7f2998d6d400a90b3f7c462085093', // Kodiak Condos
    footprintShapeId: 'shape_nyc_018', // 12pts, 54x36m commercial block
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
