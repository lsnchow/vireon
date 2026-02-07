'use client';

import React from 'react';
import type { ImpactResult } from '@/types/map';

interface HoverTooltipProps {
  x: number;
  y: number;
  buildingName?: string;
  impact?: ImpactResult | null;
  featureName?: string;
}

export default function HoverTooltip({
  x,
  y,
  buildingName,
  impact,
  featureName,
}: HoverTooltipProps) {
  if (!buildingName && !featureName) return null;

  return (
    <div
      className="pointer-events-none fixed z-[60] rounded-lg border border-[#2a2a3e] bg-[#12121a]/95 px-3 py-2 shadow-xl backdrop-blur-md"
      style={{
        left: x + 12,
        top: y + 12,
        maxWidth: 220,
      }}
    >
      {buildingName && (
        <>
          <div className="text-xs font-medium text-[#e8e8f0] truncate">
            {buildingName}
          </div>
          {impact && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] text-[#9898b0]">Acceptance:</span>
              <span
                className={`text-xs font-mono font-bold ${
                  impact.overallAcceptance >= 60
                    ? 'text-emerald-400'
                    : impact.overallAcceptance >= 35
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {impact.overallAcceptance}
              </span>
            </div>
          )}
          {impact && impact.topDrivers[0] && (
            <div className="mt-0.5 text-[10px] text-[#9898b0] truncate">
              {impact.topDrivers[0].name}: {impact.topDrivers[0].value}{' '}
              {impact.topDrivers[0].unit}
            </div>
          )}
        </>
      )}
      {featureName && (
        <div className="text-xs text-[#e8e8f0]">{featureName}</div>
      )}
    </div>
  );
}
