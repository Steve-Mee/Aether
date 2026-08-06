import { useState } from 'react';
import { Activity, Pause, Play } from 'lucide-react';
import React from 'react';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { SectionLabel, StatChip } from '@/components/command-center/primitives';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface AgentStatus {
  agentKey: string;
  displayName: string;
  isPaused: boolean;
  priority: number;
  activityCount24h: number;
  lastActiveAt?: string;
}

interface AgentControlsSectionProps {
  agents: AgentStatus[];
  onTogglePause: (agentKey: string) => void | Promise<void>;
  onSetPriority: (agentKey: string, priority: number) => void | Promise<void>;
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Zeer laag',
  3: 'Laag',
  5: 'Normaal',
  7: 'Hoog',
  9: 'Zeer hoog',
};

export default function AgentControlsSection({
  agents,
  onTogglePause,
  onSetPriority,
}: AgentControlsSectionProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const mostActiveAgent =
    agents.length === 0
      ? null
      : agents.reduce((prev, current) =>
          current.activityCount24h > prev.activityCount24h ? current : prev,
        );

  return (
    <section className="mb-8 w-full" aria-labelledby="agent-controls-heading">
      <SectionLabel
        id="agent-controls-heading"
        title={t('commandCenter.section.agents.title')}
        subtitle={t('commandCenter.section.agents.subtitle')}
      />

      {mostActiveAgent && mostActiveAgent.activityCount24h > 0 && (
        <Card className="mb-4 rounded-2xl border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity size={20} className="text-primary-readable" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t('commandCenter.agents.mostActive')}: {mostActiveAgent.displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mostActiveAgent.activityCount24h} {t('commandCenter.agents.actionsToday')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {agents.map((agent) => (
          <Card
            key={agent.agentKey}
            className={cn(
              'rounded-2xl border-border/25 transition-colors',
              agent.isPaused && 'bg-muted/20',
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{agent.displayName}</h3>
                    {agent.isPaused && (
                      <Badge variant="secondary" className="text-xs">
                        {t('commandCenter.agents.paused')}
                      </Badge>
                    )}
                    {agent.agentKey === mostActiveAgent?.agentKey &&
                      mostActiveAgent.activityCount24h > 0 && (
                        <Badge variant="default" className="text-xs">
                          {t('commandCenter.agents.mostActiveLabel')}
                        </Badge>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatChip className="text-xs">
                      {t('commandCenter.agents.priority')}: {PRIORITY_LABELS[agent.priority] || agent.priority}
                    </StatChip>
                    <StatChip className="text-xs">
                      {agent.activityCount24h} {t('commandCenter.agents.actionsToday')}
                    </StatChip>
                  </div>
                  {expandedAgent === agent.agentKey && (
                    <div className="pt-2 space-y-2 border-t border-border/20">
                      <label className="block">
                        <span className="text-xs text-muted-foreground mb-1 block">
                          {t('commandCenter.agents.priorityLabel')}
                        </span>
                        <select
                          className="w-full rounded-lg border border-border/40 bg-background px-3 py-1.5 text-sm"
                          value={agent.priority}
                          onChange={(e) => void onSetPriority(agent.agentKey, Number(e.target.value))}
                        >
                          {[1, 3, 5, 7, 9].map((p) => (
                            <option key={p} value={p}>
                              {PRIORITY_LABELS[p]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedAgent(expandedAgent === agent.agentKey ? null : agent.agentKey)
                    }
                  >
                    {expandedAgent === agent.agentKey
                      ? t('commandCenter.agents.collapse')
                      : t('commandCenter.agents.expand')}
                  </Button>
                  <Button
                    variant={agent.isPaused ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => void onTogglePause(agent.agentKey)}
                  >
                    {agent.isPaused ? (
                      <>
                        <Play size={14} className="mr-1" />
                        {t('commandCenter.agents.resume')}
                      </>
                    ) : (
                      <>
                        <Pause size={14} className="mr-1" />
                        {t('commandCenter.agents.pause')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
