'use client';

import React from 'react';
import { Play, Loader2, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import type { SimulateStatus } from '@/types/simulation';
import type { SimulationPhase } from '@/hooks/useSimulation';

interface SimulatePanelProps {
  phase: SimulationPhase;
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: string[];
  status: SimulateStatus | null;
  error: string | null;
  onSimulate: () => void;
  onReset: () => void;
  disabled?: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  impacts: 'Computing impacts...',
  agents: 'Generating stakeholder reactions...',
  aggregate: 'Aggregating sentiment...',
  complete: 'Simulation complete',
};

function formatModelName(id: string): string {
  const parts = id.split('/');
  if (parts.length === 2) {
    return `${parts[1]}`;
  }
  return id;
}

function formatProviderName(id: string): string {
  const parts = id.split('/');
  return parts[0] || id;
}

export default function SimulatePanel({
  phase,
  selectedModel,
  onModelChange,
  models,
  status,
  error,
  onSimulate,
  onReset,
  disabled,
}: SimulatePanelProps) {
  const isRunning = phase === 'running';
  const isComplete = phase === 'complete';
  const isError = phase === 'error';
  const canSimulate = phase === 'idle' || isComplete || isError;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[rgba(6,13,24,0.9)] shadow-2xl backdrop-blur-xl font-mono px-3 py-2.5">
        {/* Model selector */}
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={isRunning}
            className="appearance-none bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 pr-7 text-[10px] text-white/70 uppercase tracking-wider focus:outline-none focus:border-white/10 disabled:opacity-50 cursor-pointer"
          >
            {models.map((m) => (
              <option key={m} value={m} className="bg-[#060d18] text-white">
                {formatProviderName(m)} / {formatModelName(m)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30 pointer-events-none" />
        </div>

        <div className="h-6 w-px bg-white/[0.06]" />

        {/* Simulate button / progress */}
        {canSimulate && (
          <button
            onClick={isComplete || isError ? onReset : onSimulate}
            disabled={disabled || isRunning}
            className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/[0.06] px-4 py-1.5 text-[10px] text-white uppercase tracking-wider transition-colors hover:bg-white/[0.15] disabled:opacity-40"
          >
            {isComplete ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                Run Again
              </>
            ) : isError ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                Retry
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Simulate
              </>
            )}
          </button>
        )}

        {/* Running state: progress bar */}
        {isRunning && status && (
          <div className="flex items-center gap-3 min-w-[220px]">
            <Loader2 className="h-3.5 w-3.5 text-white/50 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-white/40">
                  {PHASE_LABELS[status.phase] || status.message || 'Processing...'}
                </span>
                <span className="text-[9px] text-white/30">{status.progress}%</span>
              </div>
              <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/30 transition-all duration-300"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              {status.partial && status.partial.agents_total > 0 && (
                <span className="text-[8px] text-white/20 mt-0.5 block">
                  Agents: {status.partial.agents_done}/{status.partial.agents_total}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Running but no status yet */}
        {isRunning && !status && (
          <div className="flex items-center gap-2 min-w-[140px]">
            <Loader2 className="h-3.5 w-3.5 text-white/50 animate-spin" />
            <span className="text-[9px] text-white/40">Starting simulation...</span>
          </div>
        )}

        {/* Error message */}
        {isError && error && (
          <>
            <div className="h-6 w-px bg-white/[0.06]" />
            <span className="text-[9px] text-red-400/70 max-w-[200px] truncate">
              {error}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
