import React from 'react';
import { cn } from '@/lib/utils';
import AgentBadge from '@/components/command/AgentBadge';
import { StatChip } from '@/components/ui';
import { StatusDot } from '@/components/intelligence';
import { t } from '@/lib/i18n';
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
        'flex flex-col gap-3 rounded-xl border p-5 text-left transition-colors duration-fast',
        'hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
        selected ? 'border-primary/40 bg-surface-elevated' : 'border-border/60 bg-card/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <AgentBadge agentKey={agent.agentKey} size="md" />
        <StatusDot
          variant={isActive ? 'active' : 'idle'}
          label={isActive ? t('agents.status.active') : t('agents.status.idle')}
        />
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {agent.description}
      </p>
      <div className="flex flex-wrap gap-2">
        {agent.proactiveCount > 0 && (
          <StatChip className="text-[10px]">
            {t('agents.metric.proactive').replace('{count}', String(agent.proactiveCount))}
          </StatChip>
        )}
        {agent.recentActionCount > 0 && (
          <StatChip className="text-[10px]">
            {t('agents.metric.actions').replace('{count}', String(agent.recentActionCount))}
          </StatChip>
        )}
      </div>
    </button>
  );
}
