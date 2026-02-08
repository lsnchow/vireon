'use client';

import React, { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  X,
  Users,
  AlertTriangle,
  MessageCircle,
  Lightbulb,
  FileEdit,
  Tag,
} from 'lucide-react';
import type { AgentReaction, AggregateResult } from '@/types/simulation';

// ── Stance styling ──────────────────────────────────────

const STANCE_CONFIG = {
  support: {
    icon: <ThumbsUp className="h-3 w-3" />,
    label: 'Support',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  neutral: {
    icon: <Minus className="h-3 w-3" />,
    label: 'Neutral',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  oppose: {
    icon: <ThumbsDown className="h-3 w-3" />,
    label: 'Oppose',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
};

function scoreColor(score: number): string {
  if (score >= 60) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

// ── Compact agent card (no expand – click opens modal) ──

function AgentCard({
  agent,
  onClick,
}: {
  agent: AgentReaction;
  onClick: () => void;
}) {
  const stance = STANCE_CONFIG[agent.stance] || STANCE_CONFIG.neutral;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full ${stance.bg} ${stance.border} border flex items-center justify-center flex-shrink-0`}
      >
        <span className={`text-sm font-bold ${stance.text}`}>
          {agent.display_name.charAt(0)}
        </span>
      </div>

      {/* Name + stance */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white truncate">
            {agent.display_name}
          </span>
          <span
            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${stance.bg} ${stance.text} border ${stance.border}`}
          >
            {stance.icon}
            {stance.label}
          </span>
        </div>
        <span className="text-[10px] text-white/40">
          {agent.agent_id.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Score */}
      <span className={`text-lg font-bold font-mono ${scoreColor(agent.score)}`}>
        {agent.score}
      </span>
    </button>
  );
}

// ── Detail section (used in modal) ──────────────────────

function Section({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="pt-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-white/40">{icon}</span>
        <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">
          {title}
        </span>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-xs text-white/70 leading-relaxed flex gap-2"
          >
            <span className="text-white/25 mt-0.5 flex-shrink-0">&gt;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Agent Detail Modal ──────────────────────────────────

function AgentDetailModal({
  agent,
  onClose,
}: {
  agent: AgentReaction;
  onClose: () => void;
}) {
  const stance = STANCE_CONFIG[agent.stance] || STANCE_CONFIG.neutral;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-h-[80vh] rounded-xl border border-white/[0.08] bg-[rgba(6,13,24,0.96)] shadow-2xl backdrop-blur-xl font-mono overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full ${stance.bg} ${stance.border} border flex items-center justify-center`}
            >
              <span className={`text-base font-bold ${stance.text}`}>
                {agent.display_name.charAt(0)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  {agent.display_name}
                </span>
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider ${stance.bg} ${stance.text} border ${stance.border}`}
                >
                  {stance.icon}
                  {stance.label}
                </span>
              </div>
              <span className="text-[10px] text-white/40">
                {agent.agent_id.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-2xl font-bold font-mono ${scoreColor(agent.score)}`}
            >
              {agent.score}
              <span className="text-xs text-white/30 font-normal">/100</span>
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {agent.concerns.length > 0 && (
            <Section
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              title="Concerns"
              items={agent.concerns}
            />
          )}

          {agent.why.length > 0 && (
            <Section
              icon={<MessageCircle className="h-3.5 w-3.5" />}
              title="Reasoning"
              items={agent.why}
            />
          )}

          {agent.would_change_mind_if.length > 0 && (
            <Section
              icon={<Lightbulb className="h-3.5 w-3.5" />}
              title="Would Change Mind If"
              items={agent.would_change_mind_if}
            />
          )}

          {agent.proposed_amendments.length > 0 && (
            <Section
              icon={<FileEdit className="h-3.5 w-3.5" />}
              title="Proposed Amendments"
              items={agent.proposed_amendments}
            />
          )}

          {agent.driver_citations.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Tag className="h-3 w-3 text-white/40" />
                <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">
                  Cited Drivers
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {agent.driver_citations.map((c, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-mono border ${
                      c.effect === 'positive'
                        ? 'border-emerald-500/20 text-emerald-400/70 bg-emerald-500/5'
                        : c.effect === 'negative'
                        ? 'border-red-500/20 text-red-400/70 bg-red-500/5'
                        : 'border-white/[0.06] text-white/40 bg-white/[0.02]'
                    }`}
                  >
                    {c.driver}: {c.value}
                    <span className="text-[8px] opacity-60">({c.effect})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────

interface AgentReactionCardsProps {
  agents: AgentReaction[];
  aggregate: AggregateResult;
  onClose: () => void;
}

export default function AgentReactionCards({
  agents,
  aggregate,
  onClose,
}: AgentReactionCardsProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentReaction | null>(null);

  const supportCount = agents.filter((a) => a.stance === 'support').length;
  const opposeCount = agents.filter((a) => a.stance === 'oppose').length;
  const neutralCount = agents.filter((a) => a.stance === 'neutral').length;

  return (
    <>
      <div className="fixed left-4 top-14 bottom-4 z-40 w-80 flex flex-col rounded-xl border border-white/[0.06] bg-[rgba(6,13,24,0.92)] shadow-2xl backdrop-blur-xl font-mono overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-white/50" />
              <h3 className="text-xs text-white/60 uppercase tracking-widest">
                Stakeholder Hearing
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-emerald-400/70">
                {supportCount} support
              </span>
              <span className="text-[10px] text-white/20">/</span>
              <span className="text-[10px] text-amber-400/70">
                {neutralCount} neutral
              </span>
              <span className="text-[10px] text-white/20">/</span>
              <span className="text-[10px] text-red-400/70">
                {opposeCount} oppose
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Aggregate summary */}
        <div className="px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
          <div>
            <span className="text-[10px] text-white/50 uppercase tracking-wider">
              Sentiment Score
            </span>
            <div
              className={`text-xl font-bold ${scoreColor(aggregate.sentiment_score)}`}
            >
              {Math.round(aggregate.sentiment_score)}
              <span className="text-xs text-white/30 font-normal ml-1">
                /100
              </span>
            </div>
          </div>
          {aggregate.notes.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {aggregate.notes.slice(0, 2).map((note, i) => (
                <p key={i} className="text-[10px] text-white/35 leading-tight">
                  {note}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Agent cards (compact, clickable) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <p className="text-[10px] text-white/30 text-center mb-1">
            Click an agent to view full details
          </p>
          {agents.map((agent) => (
            <AgentCard
              key={agent.agent_id}
              agent={agent}
              onClick={() => setSelectedAgent(agent)}
            />
          ))}
        </div>
      </div>

      {/* Detail modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </>
  );
}
