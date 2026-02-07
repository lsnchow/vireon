import type { Color, Material, MapViewState } from '@deck.gl/core';

/* -- Building type enum -- */
export type BuildingType =
  | 'civic'
  | 'educational'
  | 'commercial'
  | 'residential'
  | 'mixed_use'
  | 'mixed'
  | 'industrial';

/* -- Building template (library entry, internal) -- */
export interface BuildingTemplate {
  id: string;
  name: string;
  type: BuildingType;
  defaultHeight: number; // metres
  floors: number;
  color: Color;
  /** Footprint vertices as [x_metres, y_metres] offsets from centre. */
  footprintMeters: [number, number][];
  description?: string;
  costEstimate?: number;
  params?: Record<string, number | string>;
  /** Sketchfab model UID for 3D preview in the renderer */
  sketchfabUid?: string;
}

/* -- Building definition from JSON (PRD format) -- */
export interface BuildingDefinition {
  id: string;
  name: string;
  type: BuildingType;
  description: string;
  height_m: number;
  cost_estimate: number;
  footprint: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  params?: Record<string, number | string>;
  thumbnail?: string;
  /** Sketchfab model UID for 3D preview in the renderer */
  sketchfabUid?: string;
}

/* -- Placed building (instance on map) -- */
export interface PlacedBuilding {
  id: string;
  templateId: string;
  center: [number, number]; // [lng, lat]
  rotation: number;         // degrees, 0 = north
  height: number;           // metres
}

/* -- Overlay toggles -- */
export interface OverlayToggles {
  parks: boolean;
  waterways: boolean;
  residential: boolean;
  corridors: boolean;
}

/* -- Scenario -- */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  buildings: PlacedBuilding[];
  overlays: OverlayToggles;
}

/* -- Computed polygon ready for rendering -- */
export interface RenderableBuilding {
  id: string;
  templateId: string;
  polygon: [number, number][];
  height: number;
  color: Color;
  isSelected: boolean;
}

/* -- Impact engine types -- */
export interface ImpactDriver {
  name: string;
  value: number;
  unit: string;
  description: string;
}

export interface CriterionResult {
  id: string;
  label: string;
  score: number;       // 0–100
  higherIsWorse: boolean;
  drivers: ImpactDriver[];
}

export interface ImpactResult {
  buildingId: string;
  criteria: CriterionResult[];
  overallAcceptance: number;
  topDrivers: ImpactDriver[];
  costEstimate: number;
}

export interface MitigationResult {
  description: string;
  newCenter?: [number, number];
  newHeight?: number;
  beforeScores: CriterionResult[];
  afterScores: CriterionResult[];
}

/* -- App state -- */
export interface CivicLensState {
  placedBuildings: PlacedBuilding[];
  selectedId: string | null;
  activeScenarioId: string | null;
  overlays: OverlayToggles;
  sidebarOpen: boolean;
  impacts: Record<string, ImpactResult>;
  mitigation: MitigationResult | null;
}

/* -- App actions -- */
export type CivicLensAction =
  | { type: 'ADD_BUILDING'; templateId: string; center: [number, number] }
  | { type: 'SELECT'; id: string | null }
  | { type: 'UPDATE_BUILDING'; id: string; updates: Partial<Pick<PlacedBuilding, 'center' | 'rotation' | 'height'>> }
  | { type: 'DELETE_BUILDING'; id: string }
  | { type: 'LOAD_SCENARIO'; scenario: Scenario }
  | { type: 'CLEAR_ALL' }
  | { type: 'TOGGLE_OVERLAY'; key: keyof OverlayToggles }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'ADD_CUSTOM_TEMPLATE'; template: BuildingTemplate }
  | { type: 'SET_IMPACTS'; impacts: Record<string, ImpactResult> }
  | { type: 'SET_MITIGATION'; mitigation: MitigationResult | null }
  | { type: 'APPLY_MITIGATION'; buildingId: string; center?: [number, number]; height?: number };

/* -- Theme -- */
export interface MapTheme {
  buildingColor: Color;
  selectedColor: Color;
  material: Material;
}

/* -- Kingston constants -- */
export const KINGSTON_CENTER: [number, number] = [-76.481, 44.231];

export const KINGSTON_VIEW_STATE: MapViewState = {
  longitude: -76.481,
  latitude: 44.231,
  zoom: 15,
  pitch: 45,
  bearing: -20,
};

export const MAP_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';
