'use client';

import React, { useCallback } from 'react';
import { useCivicLens } from '@/hooks/useCivicLens';
import MapView from '@/components/MapView';
import BuildingLibrary from '@/components/BuildingLibrary';
import PlacementToolbar from '@/components/PlacementToolbar';
import ScenarioBar from '@/components/ScenarioBar';
import { KINGSTON_CENTER } from '@/types';

export default function CivicLensApp() {
  const {
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
  } = useCivicLens();

  /* Add a building at the current map center (Kingston default). */
  const handleAddBuilding = useCallback(
    (templateId: string) => {
      addBuilding(templateId, KINGSTON_CENTER);
    },
    [addBuilding]
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Map layer */}
      <MapView
        placedBuildings={state.placedBuildings}
        selectedId={state.selectedId}
        overlays={state.overlays}
        onSelect={selectBuilding}
        onUpdateBuilding={updateBuilding}
      />

      {/* Building Library sidebar */}
      <BuildingLibrary
        isOpen={state.sidebarOpen}
        onToggle={toggleSidebar}
        onAddBuilding={handleAddBuilding}
        placedCount={state.placedBuildings.length}
      />

      {/* Scenario & overlay controls (top-right) */}
      <ScenarioBar
        activeScenarioId={state.activeScenarioId}
        overlays={state.overlays}
        onLoadScenario={loadScenario}
        onClearAll={clearAll}
        onToggleOverlay={toggleOverlay}
      />

      {/* Placement toolbar (bottom-center, shown when a building is selected) */}
      {selectedBuilding && (
        <PlacementToolbar
          building={selectedBuilding}
          onUpdate={(updates) => updateBuilding(selectedBuilding.id, updates)}
          onDelete={() => deleteBuilding(selectedBuilding.id)}
          onDeselect={() => selectBuilding(null)}
        />
      )}

      {/* Branding watermark */}
      <div className="pointer-events-none fixed bottom-3 right-3 z-30 text-[10px] font-medium text-[#9898b0]/50">
        CivicLens · Kingston
      </div>
    </div>
  );
}
