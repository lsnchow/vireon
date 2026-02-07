'use client';

import { useReducer, useCallback } from 'react';
import { uid } from '@/lib/geo';
import { getBuildingById } from '@/data/buildings';
import type {
  CivicLensState,
  CivicLensAction,
  PlacedBuilding,
  Scenario,
  OverlayToggles,
} from '@/types';

const initialState: CivicLensState = {
  placedBuildings: [],
  selectedId: null,
  activeScenarioId: null,
  overlays: { parks: false, sensitiveZones: false, corridors: false },
  sidebarOpen: true,
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
        activeScenarioId: null, // user modified → detach from scenario
      };
    }

    case 'SELECT':
      return { ...state, selectedId: action.id };

    case 'UPDATE_BUILDING':
      return {
        ...state,
        placedBuildings: state.placedBuildings.map((b) =>
          b.id === action.id ? { ...b, ...action.updates } : b
        ),
        activeScenarioId: null,
      };

    case 'DELETE_BUILDING':
      return {
        ...state,
        placedBuildings: state.placedBuildings.filter((b) => b.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        activeScenarioId: null,
      };

    case 'LOAD_SCENARIO':
      return {
        ...state,
        placedBuildings: action.scenario.buildings.map((b) => ({ ...b })),
        selectedId: null,
        activeScenarioId: action.scenario.id,
        overlays: { ...action.scenario.overlays },
      };

    case 'CLEAR_ALL':
      return {
        ...state,
        placedBuildings: [],
        selectedId: null,
        activeScenarioId: null,
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

  /* Derived: get the selected building */
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
  };
}
