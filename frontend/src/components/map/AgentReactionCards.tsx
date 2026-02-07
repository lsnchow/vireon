'use client';

import React, { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  ChevronDown,
  ChevronUp,
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

// ── Single agent card ───────────────────────────────────

function AgentCard({ agent }: { agent: AgentReaction }) {
  const [expanded, setExpanded] = useState(false);
  const stance = STANCE_CONFIG[agent.stance] || STANCE_CONFIG.neutral;

  return (
    <div className="border border-white/[0.04] rounded-lg bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.03] transition-colors"
      >
        {/* Avatar placeholder */}
        <div className={`w-8 h-8 rounded-full ${stance.bg} ${stance.border} border flex items-center justify-center flex-shrink-0`}>
          <span className={`text-xs font-bold ${stance.text}`}>
            {agent.display_name.charAt(0)}
          </span>
        </div>

        {/* Name + stance */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-white truncate">
              {agent.display_name}
            </span>
            <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] uppercase tracking-wider ${stance.bg} ${stance.text} border ${stance.border}`}>
              {stance.icon}
              {stance.label}
            </span>
          </div>
          <span className="text-[9px] text-white/20">{agent.agent_id.replace(/_/g, ' ')}</span>
        </div>

        {/* Score */}
        <span className={`text-lg font-bold font-mono ${scoreColor(agent.score)}`}>
          {agent.score}
        </span>

        {expanded ? (
          <ChevronUp className="h-3 w-3 text-white/20 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 text-white/20 flex-shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/[0.04]">
          {/* Concerns */}
          {agent.concerns.length > 0 && (
            <Section
              icon={<AlertTriangle className="h-3 w-3" />}
              title="Concerns"
              items={agent.concerns}
            />
          )}

          {/* Why */}
          {agent.why.length > 0 && (
            <Section
              icon={<MessageCircle className="h-3 w-3" />}
              title="Reasoning"
              items={agent.why}
            />
          )}

          {/* Would change mind if */}
          {agent.would_change_mind_if.length > 0 && (
            <Section
              icon={<Lightbulb className="h-3 w-3" />}
              title="Would Change Mind If"
              items={agent.would_change_mind_if}
            />
          )}

          {/* Proposed amendments */}
          {agent.proposed_amendments.length > 0 && (
            <Section
              icon={<FileEdit className="h-3 w-3" />}
              title="Proposed Amendments"
              items={agent.proposed_amendments}
            />
          )}

          {/* Driver citations */}
          {agent.driver_citations.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center gap-1 mb-1">
                <Tag className="h-2.5 w-2.5 text-white/20" />
                <span className="text-[8px] text-white/30 uppercase tracking-wider">
                  Cited Drivers
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {agent.driver_citations.map((c, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[8px] font-mono border ${
                      c.effect === 'positive'
                        ? 'border-emerald-500/20 text-emerald-400/60 bg-emerald-500/5'
                        : c.effect === 'negative'
                        ? 'border-red-500/20 text-red-400/60 bg-red-500/5'
                        : 'border-white/[0.06] text-white/30 bg-white/[0.02]'
                    }`}
                  >
                    {c.driver}: {c.value}
                    <span className="text-[7px] opacity-60">
                      ({c.effect})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
    <div className="pt-1.5">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-white/20">{icon}</span>
        <span className="text-[8px] text-white/30 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-[10px] text-white/50 leading-tight flex gap-1.5">
            <span className="text-white/15 mt-0.5 flex-shrink-0">&gt;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
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
  const supportCount = agents.filter((a) => a.stance === 'support').length;
  const opposeCount = agents.filter((a) => a.stance === 'oppose').length;
  const neutralCount = agents.filter((a) => a.stance === 'neutral').length;

  return (
    <div className="fixed left-4 top-14 bottom-4 z-40 w-80 flex flex-col rounded-xl border border-white/[0.06] bg-[rgba(6,13,24,0.92)] shadow-2xl backdrop-blur-xl font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-white/30" />
            <h3 className="text-[10px] text-white/50 uppercase tracking-widest">
              Stakeholder Hearing
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-emerald-400/60">{supportCount} support</span>
            <span className="text-[9px] text-white/15">/</span>
            <span className="text-[9px] text-amber-400/60">{neutralCount} neutral</span>
            <span className="text-[9px] text-white/15">/</span>
            <span className="text-[9px] text-red-400/60">{opposeCount} oppose</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Aggregate summary */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] text-white/30 uppercase tracking-wider">
              Sentiment Score
            </span>
            <div className={`text-xl font-bold ${scoreColor(aggregate.sentiment_score)}`}>
              {Math.round(aggregate.sentiment_score)}
              <span className="text-[10px] text-white/20 font-normal ml-1">/100</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-white/30 uppercase tracking-wider">
              Blended Score
            </span>
            <div className={`text-xl font-bold ${scoreColor(aggregate.final_score)}`}>
              {Math.round(aggregate.final_score)}
              <span className="text-[10px] text-white/20 font-normal ml-1">/100</span>
            </div>
          </div>
        </div>
        {aggregate.notes.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {aggregate.notes.slice(0, 2).map((note, i) => (
              <p key={i} className="text-[8px] text-white/20 leading-tight">{note}</p>
            ))}
          </div>
        )}
      </div>

      {/* Agent cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.map((agent) => (
          <AgentCard key={agent.agent_id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
