'use client';

import React from 'react';
import {
  MapPin,
  Eraser,
  Trees,
  Droplets,
  Home,
  Route,
} from 'lucide-react';
import { SCENARIOS } from '@/data/scenarios';
import type { Scenario, OverlayToggles } from '@/types/map';

interface ScenarioBarProps {
  activeScenarioId: string | null;
  overlays: OverlayToggles;
  onLoadScenario: (scenario: Scenario) => void;
  onClearAll: () => void;
  onToggleOverlay: (key: keyof OverlayToggles) => void;
}

const OVERLAY_BUTTONS: {
  key: keyof OverlayToggles;
  label: string;
  icon: React.ReactNode;
  activeColor: string;
}[] = [
  {
    key: 'parks',
    label: 'Parks',
    icon: <Trees className="h-3.5 w-3.5" />,
    activeColor: 'bg-green-600/30 text-green-300 border-green-500/50',
  },
  {
    key: 'waterways',
    label: 'Water',
    icon: <Droplets className="h-3.5 w-3.5" />,
    activeColor: 'bg-blue-600/30 text-blue-300 border-blue-500/50',
  },
  {
    key: 'residential',
    label: 'Residential',
    icon: <Home className="h-3.5 w-3.5" />,
    activeColor: 'bg-red-600/20 text-red-300 border-red-500/50',
  },
  {
    key: 'corridors',
    label: 'Roads',
    icon: <Route className="h-3.5 w-3.5" />,
    activeColor: 'bg-orange-600/20 text-orange-300 border-orange-500/50',
  },
];

export default function ScenarioBar({
  activeScenarioId,
  overlays,
  onLoadScenario,
  onClearAll,
  onToggleOverlay,
}: ScenarioBarProps) {
  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-[rgba(6,13,24,0.85)] p-1.5 shadow-lg backdrop-blur-xl">
        <MapPin className="mx-1 h-4 w-4 text-white/30" />
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onLoadScenario(scenario)}
            className={`rounded-md px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
              activeScenarioId === scenario.id
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title={scenario.description}
          >
            {scenario.name}
          </button>
        ))}
        <div className="mx-0.5 h-5 w-px bg-white/[0.06]" />
        <button
          onClick={onClearAll}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-red-400/70 transition-colors hover:bg-red-400/10"
        >
          <Eraser className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-[rgba(6,13,24,0.85)] p-1.5 shadow-lg backdrop-blur-xl">
        {OVERLAY_BUTTONS.map(({ key, label, icon, activeColor }) => (
          <button
            key={key}
            onClick={() => onToggleOverlay(key)}
            className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
              overlays[key]
                ? activeColor
                : 'border-transparent text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
