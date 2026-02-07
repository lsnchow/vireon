import type { Color, Material, MapViewState } from '@deck.gl/core';

/* ── Building template (library entry) ── */
export interface BuildingTemplate {
  id: string;
  name: string;
  type: 'civic' | 'educational' | 'commercial' | 'residential' | 'mixed' | 'industrial';
  defaultHeight: number; // metres
  floors: number;
  color: Color;
  /** Footprint vertices as [x_metres, y_metres] offsets from centre. */
  footprintMeters: [number, number][];
  description?: string;
}

/* ── Placed building (instance on map) ── */
export interface PlacedBuilding {
  id: string;
  templateId: string;
  center: [number, number]; // [lng, lat]
  rotation: number;         // degrees, 0 = north
  height: number;           // metres
}

/* ── Overlay toggles ── */
export interface OverlayToggles {
  parks: boolean;
  sensitiveZones: boolean;
  corridors: boolean;
}

/* ── Scenario ── */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  buildings: PlacedBuilding[];
  overlays: OverlayToggles;
}

/* ── Computed polygon ready for rendering ── */
export interface RenderableBuilding {
  id: string;
  templateId: string;
  polygon: [number, number][];
  height: number;
  color: Color;
  isSelected: boolean;
}

/* ── App state ── */
export interface CivicLensState {
  placedBuildings: PlacedBuilding[];
  selectedId: string | null;
  activeScenarioId: string | null;
  overlays: OverlayToggles;
  sidebarOpen: boolean;
}

/* ── App actions ── */
export type CivicLensAction =
  | { type: 'ADD_BUILDING'; templateId: string; center: [number, number] }
  | { type: 'SELECT'; id: string | null }
  | { type: 'UPDATE_BUILDING'; id: string; updates: Partial<Pick<PlacedBuilding, 'center' | 'rotation' | 'height'>> }
  | { type: 'DELETE_BUILDING'; id: string }
  | { type: 'LOAD_SCENARIO'; scenario: Scenario }
  | { type: 'CLEAR_ALL' }
  | { type: 'TOGGLE_OVERLAY'; key: keyof OverlayToggles }
  | { type: 'TOGGLE_SIDEBAR' };

/* ── Theme ── */
export interface MapTheme {
  buildingColor: Color;
  selectedColor: Color;
  material: Material;
}

/* ── Kingston constants ── */
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
