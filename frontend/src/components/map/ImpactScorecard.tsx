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
  Box,
  ArrowDown,
  ArrowUp,
  Activity,
} from 'lucide-react';
import type { ImpactResult, CriterionResult, MitigationResult } from '@/types/map';
import type { AggregateResult } from '@/types/simulation';

/* ── Score helpers ── */
function scoreColor(score: number, higherIsWorse: boolean): string {
  const effective = higherIsWorse ? score : 100 - score;
  if (effective < 30) return 'bg-emerald-500';
  if (effective < 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreTextColor(score: number, higherIsWorse: boolean): string {
  const effective = higherIsWorse ? score : 100 - score;
  if (effective < 30) return 'text-emerald-400';
  if (effective < 60) return 'text-amber-400';
  return 'text-red-400';
}

function getGradeInfo(score: number): { grade: string; color: string; strokeColor: string } {
  if (score >= 80) return { grade: 'A', color: 'text-emerald-400', strokeColor: '#34d399' };
  if (score >= 60) return { grade: 'B', color: 'text-green-400', strokeColor: '#4ade80' };
  if (score >= 40) return { grade: 'C', color: 'text-amber-400', strokeColor: '#fbbf24' };
  if (score >= 20) return { grade: 'D', color: 'text-red-400', strokeColor: '#f87171' };
  return { grade: 'F', color: 'text-red-500', strokeColor: '#ef4444' };
}

/* ── Icons for criteria ── */
const CRITERION_ICONS: Record<string, React.ReactNode> = {
  c1_env: <Leaf className="h-4 w-4" />,
  c2_infra: <Zap className="h-4 w-4" />,
  c3_live: <Home className="h-4 w-4" />,
  c4_econ: <TrendingUp className="h-4 w-4" />,
  c5_accept: <Users className="h-4 w-4" />,
};

/* ── Circular Progress Gauge ── */
function CircularGauge({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashLength = (score / 100) * circumference;
  const { grade, color, strokeColor } = getGradeInfo(score);

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <svg width="110" height="110" viewBox="0 0 100 100">
          {/* Background ring */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="7"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="7"
            strokeDasharray={`${dashLength} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className="transition-all duration-700"
          />
          {/* Grade letter */}
          <text
            x="50"
            y="54"
            textAnchor="middle"
            fill="white"
            fontSize="28"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {grade}
          </text>
        </svg>
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold font-mono ${color}`}>{score}</span>
          <span className="text-xs text-white/30 font-mono">/100</span>
        </div>
        <span className="text-[10px] text-white/40 mt-1">
          Overall Acceptance
        </span>
        <span className="text-[10px] text-white/30">
          5 criteria · weighted average
        </span>
      </div>
    </div>
  );
}

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
    <div className="border-b border-white/[0.04] last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className={scoreTextColor(criterion.score, criterion.higherIsWorse)}>
          {CRITERION_ICONS[criterion.id] ?? <Zap className="h-4 w-4" />}
        </span>

        <span className="flex-1 text-xs font-medium text-white truncate">
          {criterion.label}
        </span>

        {/* Score number */}
        <span
          className={`text-sm font-mono font-bold ${scoreTextColor(
            criterion.score,
            criterion.higherIsWorse
          )}`}
        >
          {criterion.score}
        </span>

        {/* Delta indicator */}
        {delta !== undefined && delta !== 0 && (
          <span
            className={`flex items-center text-xs font-mono ${
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
        <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${scoreColor(
              criterion.score,
              criterion.higherIsWorse
            )}`}
            style={{ width: `${criterion.score}%` }}
          />
        </div>

        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-white/30" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-white/30" />
        )}
      </button>

      {/* Drivers breakdown */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {criterion.drivers.map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-white/25 mt-0.5">{'>'}</span>
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-medium text-white/70">{d.name}:</span>
                  <span className="font-mono text-white/40">
                    {d.value === Infinity ? '∞' : d.value}
                    {d.unit ? ` ${d.unit}` : ''}
                  </span>
                </div>
                <div className="text-white/35 leading-snug mt-0.5">{d.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Blended score helper ── */
function blendedScoreColor(score: number): string {
  if (score >= 60) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

/* ── Main scorecard ── */
interface ImpactScorecardProps {
  impact: ImpactResult | null;
  mitigation: MitigationResult | null;
  buildingName: string;
  aggregateResult?: AggregateResult | null;
}

export default function ImpactScorecard({
  impact,
  mitigation,
  buildingName,
  aggregateResult,
}: ImpactScorecardProps) {
  if (!impact) {
    return (
      <div className="fixed right-4 top-16 z-40 w-96 rounded-xl border border-white/[0.06] bg-[rgba(6,13,24,0.9)] shadow-2xl backdrop-blur-xl font-mono">
        <div className="px-5 py-8 text-center text-xs text-white/40 uppercase tracking-wider">
          Select or place a building to see impact scores
        </div>
      </div>
    );
  }

  const afterMap = mitigation
    ? Object.fromEntries(mitigation.afterScores.map((c) => [c.id, c]))
    : {};

  return (
    <div className="fixed right-4 top-16 z-40 w-96 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-xl border border-white/[0.06] bg-[rgba(6,13,24,0.9)] shadow-2xl backdrop-blur-xl font-mono">
      {/* Header */}
      <div className="border-b border-white/[0.04] px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-white/40" />
          <h3 className="text-xs text-white/60 uppercase tracking-widest">
            Impact Scorecard
          </h3>
        </div>
        <p className="text-sm text-white font-medium truncate">{buildingName}</p>
        <p className="text-[10px] text-white/30 mt-0.5">
          Deterministic analysis of placement impact
        </p>
      </div>

      {/* Circular gauge */}
      <div className="px-5 py-5 border-b border-white/[0.04]">
        <CircularGauge score={impact.overallAcceptance} />
      </div>

      {/* Blended score (shown after simulation) */}
      {aggregateResult && (
        <div className="px-5 py-4 border-b border-white/[0.04] bg-white/[0.015]">
          <div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Final Blended</span>
            <div className={`text-base font-bold ${blendedScoreColor(aggregateResult.final_score)}`}>
              {Math.round(aggregateResult.final_score)}
              <span className="text-xs text-white/25 font-normal ml-1">/100</span>
            </div>
          </div>
          <p className="text-[10px] text-white/30 mt-1.5">
            70% deterministic + 30% stakeholder sentiment
          </p>
        </div>
      )}

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
      <div className="border-t border-white/[0.04] px-5 py-2.5 flex items-center gap-2">
        <DollarSign className="h-3.5 w-3.5 text-white/30" />
        <span className="text-[11px] text-white/40">Est. Cost:</span>
        <span className="text-xs font-medium text-white">
          ${(impact.costEstimate / 1_000_000).toFixed(1)}M
        </span>
      </div>

      {/* Gross building volume */}
      <div className="border-t border-white/[0.04] px-5 py-2.5 flex items-center gap-2">
        <Box className="h-3.5 w-3.5 text-white/30" />
        <span className="text-[11px] text-white/40">Gross Volume:</span>
        <span className="text-xs font-medium text-white">
          {impact.grossVolume >= 1_000
            ? `${(impact.grossVolume / 1_000).toFixed(1)}k`
            : impact.grossVolume}{' '}
          m&sup3;
        </span>
      </div>

      {/* Mitigation suggestion */}
      {mitigation && (
        <div className="border-t border-white/10 bg-white/[0.03] px-5 py-3">
          <div className="text-[10px] font-medium text-white/50 mb-1 uppercase tracking-wider">
            Mitigation Applied
          </div>
          <div className="text-xs text-white/60">
            {mitigation.description}
          </div>
        </div>
      )}
    </div>
  );
}
