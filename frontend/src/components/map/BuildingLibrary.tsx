'use client';

import React from 'react';
import { Building, Plus, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { BUILDINGS, TYPE_BADGES } from '@/data/buildings';
import type { BuildingTemplate } from '@/types/map';

interface BuildingLibraryProps {
  isOpen: boolean;
  onToggle: () => void;
  onAddBuilding: (templateId: string) => void;
  placedCount: number;
}

function FootprintPreview({ template }: { template: BuildingTemplate }) {
  const pts = template.footprintMeters;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 4;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  const pathData =
    pts
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'}${p[0] - minX + pad} ${-(p[1] - maxY) + pad}`
      )
      .join(' ') + ' Z';

  const [r, g, b] = template.color as [number, number, number];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-14 w-14"
      style={{ filter: 'drop-shadow(0 0 6px rgba(108, 99, 255, 0.3))' }}
    >
      <path
        d={pathData}
        fill={`rgba(${r}, ${g}, ${b}, 0.5)`}
        stroke={`rgb(${r}, ${g}, ${b})`}
        strokeWidth={1.5}
      />
    </svg>
  );
}

export default function BuildingLibrary({
  isOpen,
  onToggle,
  onAddBuilding,
  placedCount,
}: BuildingLibraryProps) {
  return (
    <>
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-14 z-50 flex items-center gap-2 rounded-lg bg-[#12121a]/90 px-3 py-2 text-sm font-medium text-[#e8e8f0] shadow-lg backdrop-blur-md transition-colors hover:bg-[#1a1a2e] border border-[#2a2a3e]"
        >
          <Building className="h-4 w-4" />
          <span>Buildings</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div
        className={`fixed left-0 top-0 z-40 flex h-full w-80 flex-col border-r border-[#2a2a3e] bg-[#12121a]/95 shadow-2xl backdrop-blur-md transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#2a2a3e] px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#6c63ff]" />
            <h2 className="text-base font-semibold text-[#e8e8f0]">
              Building Library
            </h2>
          </div>
          <button
            onClick={onToggle}
            className="rounded-md p-1 text-[#9898b0] transition-colors hover:bg-[#1a1a2e] hover:text-[#e8e8f0]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-[#2a2a3e] px-4 py-2 text-xs text-[#9898b0]">
          {placedCount} building{placedCount !== 1 ? 's' : ''} placed on map
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-2">
            {BUILDINGS.map((template) => {
              const badge = TYPE_BADGES[template.type];
              return (
                <div
                  key={template.id}
                  className="group flex items-start gap-3 rounded-lg border border-[#2a2a3e] bg-[#1a1a2e] p-3 transition-colors hover:border-[#6c63ff]/40 hover:bg-[#22223a]"
                >
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-[#0a0a0f]">
                    <FootprintPreview template={template} />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-[#e8e8f0]">
                        {template.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-[#9898b0]">
                        {template.floors}F &middot; {template.defaultHeight}m
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-[10px] leading-tight text-[#9898b0]">
                        {template.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => onAddBuilding(template.id)}
                    className="flex-shrink-0 self-center rounded-md bg-[#6c63ff] p-1.5 text-white shadow transition-colors hover:bg-[#5a52e0]"
                    title="Add to map"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[#2a2a3e] px-4 py-2 text-[10px] text-[#9898b0]">
          Click <Plus className="inline h-3 w-3" /> to place a building, then
          drag it on the map to reposition.
        </div>
      </div>
    </>
  );
}
