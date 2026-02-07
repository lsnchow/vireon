'use client';

import { useReducer, useCallback } from 'react';
import { uid } from '@/lib/geo';
import { getBuildingById, addBuildingTemplate } from '@/data/buildings';
import type {
  CivicLensState,
  CivicLensAction,
  PlacedBuilding,
  Scenario,
  OverlayToggles,
  BuildingTemplate,
  ImpactResult,
  MitigationResult,
} from '@/types/map';

const initialState: CivicLensState = {
  placedBuildings: [],
  selectedId: null,
  activeScenarioId: null,
  overlays: { parks: false, waterways: false, residential: false, corridors: false },
  sidebarOpen: true,
  impacts: {},
  mitigation: null,
};

function reducer(state: CivicLensState, action: CivicLensAction): CivicLensState {
  switch (action.type) {
    case 'ADD_BUILDING': {
      const template = getBuildingById(action.templateId);
      if (!template) return state;
      const newBuilding: PlacedBuilding = {
        id: uid(),
        templateId: action.templateId,
        center: action.center,
        rotation: 0,
        height: template.defaultHeight,
      };
      return {
        ...state,
        placedBuildings: [...state.placedBuildings, newBuilding],
        selectedId: newBuilding.id,
        activeScenarioId: null,
        mitigation: null,
      };
    }

    case 'SELECT':
      return { ...state, selectedId: action.id, mitigation: null };

    case 'UPDATE_BUILDING':
      return {
        ...state,
        placedBuildings: state.placedBuildings.map((b) =>
          b.id === action.id ? { ...b, ...action.updates } : b
        ),
        activeScenarioId: null,
        mitigation: null,
      };

    case 'DELETE_BUILDING':
      return {
        ...state,
        placedBuildings: state.placedBuildings.filter((b) => b.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        activeScenarioId: null,
        mitigation: null,
      };

    case 'LOAD_SCENARIO':
      return {
        ...state,
        placedBuildings: action.scenario.buildings.map((b) => ({ ...b })),
        selectedId: null,
        activeScenarioId: action.scenario.id,
        overlays: { ...action.scenario.overlays },
        mitigation: null,
      };

    case 'CLEAR_ALL':
      return {
        ...state,
        placedBuildings: [],
        selectedId: null,
        activeScenarioId: null,
        impacts: {},
        mitigation: null,
      };

    case 'TOGGLE_OVERLAY':
      return {
        ...state,
        overlays: {
          ...state.overlays,
          [action.key]: !state.overlays[action.key],
        },
      };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case 'ADD_CUSTOM_TEMPLATE':
      return state;

    case 'SET_IMPACTS':
      return { ...state, impacts: action.impacts };

    case 'SET_MITIGATION':
      return { ...state, mitigation: action.mitigation };

    case 'APPLY_MITIGATION': {
      return {
        ...state,
        placedBuildings: state.placedBuildings.map((b) =>
          b.id === action.buildingId
            ? {
                ...b,
                ...(action.center ? { center: action.center } : {}),
                ...(action.height !== undefined ? { height: action.height } : {}),
              }
            : b
        ),
        mitigation: null,
      };
    }

    default:
      return state;
  }
}

export function useCivicLens() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addBuilding = useCallback(
    (templateId: string, center: [number, number]) => {
      dispatch({ type: 'ADD_BUILDING', templateId, center });
    },
    []
  );

  const selectBuilding = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT', id });
  }, []);

  const updateBuilding = useCallback(
    (id: string, updates: Partial<Pick<PlacedBuilding, 'center' | 'rotation' | 'height'>>) => {
      dispatch({ type: 'UPDATE_BUILDING', id, updates });
    },
    []
  );

  const deleteBuilding = useCallback((id: string) => {
    dispatch({ type: 'DELETE_BUILDING', id });
  }, []);

  const loadScenario = useCallback((scenario: Scenario) => {
    dispatch({ type: 'LOAD_SCENARIO', scenario });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const toggleOverlay = useCallback((key: keyof OverlayToggles) => {
    dispatch({ type: 'TOGGLE_OVERLAY', key });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const addCustomTemplate = useCallback(
    (templateData: Omit<BuildingTemplate, 'id'>): string => {
      const id = 'custom-' + uid();
      const template: BuildingTemplate = { ...templateData, id };
      addBuildingTemplate(template);
      dispatch({ type: 'ADD_CUSTOM_TEMPLATE', template });
      return id;
    },
    []
  );

  const setImpacts = useCallback((impacts: Record<string, ImpactResult>) => {
    dispatch({ type: 'SET_IMPACTS', impacts });
  }, []);

  const setMitigation = useCallback((mitigation: MitigationResult | null) => {
    dispatch({ type: 'SET_MITIGATION', mitigation });
  }, []);

  const applyMitigation = useCallback(
    (buildingId: string, center?: [number, number], height?: number) => {
      dispatch({ type: 'APPLY_MITIGATION', buildingId, center, height });
    },
    []
  );

  const selectedBuilding = state.selectedId
    ? state.placedBuildings.find((b) => b.id === state.selectedId) ?? null
    : null;

  return {
    state,
    selectedBuilding,
    addBuilding,
    selectBuilding,
    updateBuilding,
    deleteBuilding,
    loadScenario,
    clearAll,
    toggleOverlay,
    toggleSidebar,
    addCustomTemplate,
    setImpacts,
    setMitigation,
    applyMitigation,
  };
}
