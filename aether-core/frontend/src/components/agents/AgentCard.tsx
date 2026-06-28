import React from 'react';
import { cn } from '@/lib/utils';
import AgentBadge from '@/components/command/AgentBadge';
import type { AgentRosterEntry } from '@/types/agents';

interface AgentCardProps {
  agent: AgentRosterEntry;
  selected: boolean;
  onSelect: () => void;
}

export default function AgentCard({ agent, selected, onSelect }: AgentCardProps) {
  const isActive = agent.status === 'active';

  return (
    <button
      type="button"
      data-testid={`agent-card-${agent.agentKey}`}
      onClick={onSelect}
      className={cn(
        'flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors duration-150',
        'hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
        selected ? 'border-primary/40 bg-surface-elevated' : 'border-border/60 bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <AgentBadge agentKey={agent.agentKey} size="md" />
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide',
            isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40',
            )}
          />
          {isActive ? 'Actief' : 'Idle'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {agent.proactiveCount > 0 && <span>{agent.proactiveCount} proactief</span>}
        {agent.recentActionCount > 0 && <span>{agent.recentActionCount} acties (7d)</span>}
      </div>
    </button>
  );
}
