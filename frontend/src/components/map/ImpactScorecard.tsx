'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Leaf,
  Zap,
  Home,
  TrendingUp,
  Users,
  DollarSign,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import type { ImpactResult, CriterionResult, MitigationResult } from '@/types/map';

/* ── Score bar color ── */
function scoreColor(score: number, higherIsWorse: boolean): string {
  const effective = higherIsWorse ? score : 100 - score;
  if (effective < 30) return 'bg-emerald-500';
  if (effective < 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreBgColor(score: number, higherIsWorse: boolean): string {
  const effective = higherIsWorse ? score : 100 - score;
  if (effective < 30) return 'text-emerald-400';
  if (effective < 60) return 'text-amber-400';
  return 'text-red-400';
}

/* ── Icons for criteria ── */
const CRITERION_ICONS: Record<string, React.ReactNode> = {
  c1_env: <Leaf className="h-4 w-4" />,
  c2_infra: <Zap className="h-4 w-4" />,
  c3_live: <Home className="h-4 w-4" />,
  c4_econ: <TrendingUp className="h-4 w-4" />,
  c5_accept: <Users className="h-4 w-4" />,
};

/* ── Single criterion row ── */
function CriterionRow({
  criterion,
  deltaCriterion,
}: {
  criterion: CriterionResult;
  deltaCriterion?: CriterionResult;
}) {
  const [expanded, setExpanded] = useState(false);

  const delta = deltaCriterion
    ? deltaCriterion.score - criterion.score
    : undefined;

  return (
    <div className="border-b border-[#2a2a3e] last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-[#1a1a2e] transition-colors"
      >
        <span className={scoreBgColor(criterion.score, criterion.higherIsWorse)}>
          {CRITERION_ICONS[criterion.id] ?? <Zap className="h-4 w-4" />}
        </span>

        <span className="flex-1 text-xs font-medium text-[#e8e8f0] truncate">
          {criterion.label}
        </span>

        {/* Score number */}
        <span
          className={`text-sm font-mono font-bold ${scoreBgColor(
            criterion.score,
            criterion.higherIsWorse
          )}`}
        >
          {criterion.score}
        </span>

        {/* Delta indicator */}
        {delta !== undefined && delta !== 0 && (
          <span
            className={`flex items-center text-[10px] font-mono ${
              (criterion.higherIsWorse ? delta < 0 : delta > 0)
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {delta > 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {Math.abs(delta)}
          </span>
        )}

        {/* Score bar */}
        <div className="w-16 h-1.5 rounded-full bg-[#2a2a3e] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${scoreColor(
              criterion.score,
              criterion.higherIsWorse
            )}`}
            style={{ width: `${criterion.score}%` }}
          />
        </div>

        {expanded ? (
          <ChevronUp className="h-3 w-3 text-[#9898b0]" />
        ) : (
          <ChevronDown className="h-3 w-3 text-[#9898b0]" />
        )}
      </button>

      {/* Drivers breakdown */}
      {expanded && (
        <div className="px-3 pb-2.5 space-y-1.5">
          {criterion.drivers.map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <span className="text-[#6c63ff] mt-0.5">{'>'}</span>
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-medium text-[#e8e8f0]">{d.name}:</span>
                  <span className="font-mono text-[#9898b0]">
                    {d.value === Infinity ? '∞' : d.value}
                    {d.unit ? ` ${d.unit}` : ''}
                  </span>
                </div>
                <div className="text-[#9898b0] leading-tight">{d.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main scorecard ── */
interface ImpactScorecardProps {
  impact: ImpactResult | null;
  mitigation: MitigationResult | null;
  buildingName: string;
}

export default function ImpactScorecard({
  impact,
  mitigation,
  buildingName,
}: ImpactScorecardProps) {
  if (!impact) {
    return (
      <div className="fixed right-4 top-36 z-40 w-72 rounded-xl border border-[#2a2a3e] bg-[#12121a]/95 shadow-2xl backdrop-blur-md">
        <div className="px-4 py-3 text-center text-xs text-[#9898b0]">
          Select or place a building to see impact scores
        </div>
      </div>
    );
  }

  const afterMap = mitigation
    ? Object.fromEntries(mitigation.afterScores.map((c) => [c.id, c]))
    : {};

  return (
    <div className="fixed right-4 top-36 z-40 w-72 rounded-xl border border-[#2a2a3e] bg-[#12121a]/95 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#2a2a3e] px-4 py-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#e8e8f0] truncate">
            {buildingName}
          </h3>
          <div
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreBgColor(
              impact.overallAcceptance,
              false
            )} bg-[#1a1a2e]`}
          >
            Acceptance: {impact.overallAcceptance}
          </div>
        </div>
      </div>

      {/* Criteria list */}
      <div>
        {impact.criteria.map((c) => (
          <CriterionRow
            key={c.id}
            criterion={c}
            deltaCriterion={afterMap[c.id]}
          />
        ))}
      </div>

      {/* Cost estimate */}
      <div className="border-t border-[#2a2a3e] px-4 py-2 flex items-center gap-2">
        <DollarSign className="h-3.5 w-3.5 text-[#6c63ff]" />
        <span className="text-[10px] text-[#9898b0]">Est. Cost:</span>
        <span className="text-xs font-mono font-medium text-[#e8e8f0]">
          ${(impact.costEstimate / 1_000_000).toFixed(1)}M
        </span>
      </div>

      {/* Top drivers for acceptance */}
      {impact.topDrivers.length > 0 && (
        <div className="border-t border-[#2a2a3e] px-4 py-2">
          <div className="text-[10px] font-medium text-[#9898b0] mb-1">
            Key Drivers
          </div>
          {impact.topDrivers.map((d, i) => (
            <div key={i} className="flex items-baseline gap-1 text-[10px]">
              <span className="text-[#6c63ff]">{'>'}</span>
              <span className="text-[#e8e8f0]">{d.name}</span>
              <span className="font-mono text-[#9898b0]">
                {d.value === Infinity ? '∞' : d.value} {d.unit}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Mitigation suggestion */}
      {mitigation && (
        <div className="border-t border-[#6c63ff]/30 bg-[#6c63ff]/5 px-4 py-2">
          <div className="text-[10px] font-medium text-[#6c63ff] mb-1">
            Mitigation Applied
          </div>
          <div className="text-[10px] text-[#e8e8f0]">
            {mitigation.description}
          </div>
        </div>
      )}
    </div>
  );
}
