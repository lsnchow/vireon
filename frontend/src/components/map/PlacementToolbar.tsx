'use client';

import React from 'react';
import Link from 'next/link';
import {
  RotateCw,
  ArrowUpDown,
  Trash2,
  X,
  Minus,
  Plus,
  Move,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { getBuildingById, TYPE_BADGES } from '@/data/buildings';
import type { PlacedBuilding } from '@/types/map';

interface PlacementToolbarProps {
  building: PlacedBuilding;
  onUpdate: (updates: Partial<Pick<PlacedBuilding, 'center' | 'rotation' | 'height'>>) => void;
  onDelete: () => void;
  onDeselect: () => void;
  onMitigate?: () => void;
  impactScore?: number;
}

export default function PlacementToolbar({
  building,
  onUpdate,
  onDelete,
  onDeselect,
  onMitigate,
  impactScore,
}: PlacementToolbarProps) {
  const template = getBuildingById(building.templateId);
  if (!template) return null;
  const badge = TYPE_BADGES[template.type] ?? TYPE_BADGES.commercial;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-stretch gap-0 rounded-xl border border-white/[0.06] bg-[rgba(6,13,24,0.9)] shadow-2xl backdrop-blur-xl font-mono">
        {/* Building info */}
        <div className="flex items-center gap-2 border-r border-white/[0.06] px-4 py-3">
          <Move className="h-4 w-4 text-white/30" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white">
                {template.name}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-[10px] text-white/30">
              Drag on map to reposition
            </p>
          </div>
        </div>

        {/* Height control */}
        <div className="flex flex-col items-center justify-center border-r border-white/[0.06] px-4 py-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] text-white/30">
            <ArrowUpDown className="h-3 w-3" />
            Height
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdate({ height: Math.max(3, building.height - 3) })}
              className="rounded bg-white/[0.04] p-1 text-white/40 hover:bg-white/[0.08] hover:text-white"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="range"
              min={3}
              max={120}
              step={1}
              value={building.height}
              onChange={(e) => onUpdate({ height: Number(e.target.value) })}
              className="w-24"
            />
            <button
              onClick={() => onUpdate({ height: Math.min(120, building.height + 3) })}
              className="rounded bg-white/[0.04] p-1 text-white/40 hover:bg-white/[0.08] hover:text-white"
            >
              <Plus className="h-3 w-3" />
            </button>
            <span className="w-12 text-right text-xs text-white">
              {building.height}m
            </span>
          </div>
        </div>

        {/* Rotation control */}
        <div className="flex flex-col items-center justify-center border-r border-white/[0.06] px-4 py-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] text-white/30">
            <RotateCw className="h-3 w-3" />
            Rotation
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdate({ rotation: (building.rotation - 15 + 360) % 360 })}
              className="rounded bg-white/[0.04] p-1 text-white/40 hover:bg-white/[0.08] hover:text-white"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              value={building.rotation}
              onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
              className="w-24"
            />
            <button
              onClick={() => onUpdate({ rotation: (building.rotation + 15) % 360 })}
              className="rounded bg-white/[0.04] p-1 text-white/40 hover:bg-white/[0.08] hover:text-white"
            >
              <Plus className="h-3 w-3" />
            </button>
            <span className="w-12 text-right text-xs text-white">
              {building.rotation}&deg;
            </span>
          </div>
        </div>

        {/* Mitigate button */}
        {onMitigate && (
          <div className="flex items-center border-r border-white/[0.06] px-3">
            <button
              onClick={onMitigate}
              className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-3 py-2 text-[10px] uppercase tracking-wider text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              title="Apply mitigation to reduce worst impact"
            >
              <Shield className="h-3.5 w-3.5" />
              Mitigate
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 px-3">
          {impactScore !== undefined && (
            <div className="mr-1 flex flex-col items-center">
              <span className="text-[9px] text-white/30">Score</span>
              <span
                className={`text-sm font-bold ${
                  impactScore >= 60
                    ? 'text-emerald-400'
                    : impactScore >= 35
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {impactScore}
              </span>
            </div>
          )}
          <Link
            href="/renderer"
            className="rounded-md p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Back to Catalog"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <button
            onClick={onDelete}
            className="rounded-md p-2 text-red-400/70 transition-colors hover:bg-red-400/10"
            title="Delete building"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDeselect}
            className="rounded-md p-2 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Deselect"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
