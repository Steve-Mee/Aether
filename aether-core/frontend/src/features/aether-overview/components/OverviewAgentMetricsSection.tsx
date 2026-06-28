import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { SectionLabel } from '@/components/command-center/primitives';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import { t } from '@/lib/i18n';
import type { AgentPerformanceDto } from '@/types/agents';

interface OverviewAgentMetricsSectionProps {
  agents: AgentPerformanceDto[];
  highlightedId?: string | null;
}

export default function OverviewAgentMetricsSection({
  agents,
  highlightedId,
}: OverviewAgentMetricsSectionProps) {
  if (agents.length === 0) return null;

  return (
    <section className="mb-8" data-testid="overview-agent-metrics-section">
      <SectionLabel title={t('overview.section.agentMetrics')} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {agents.map((agent) => (
          <Card
            key={agent.agentKey}
            data-testid={`overview-agent-metric-${agent.agentKey}`}
            data-highlighted={highlightedId === agent.agentKey ? 'true' : undefined}
            className="rounded-xl border-border/25 bg-card/40 data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-primary/40"
          >
            <CardContent className="p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <Bot size={14} className="text-primary shrink-0" aria-hidden />
                <Link
                  to={`/timeline?agent=${encodeURIComponent(agent.agentKey)}`}
                  className="text-sm font-medium hover:text-primary truncate"
                >
                  {agentDisplayLabel(agent.agentKey)}
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('overview.agent.successRate').replace(
                  '{rate}',
                  String(Math.round(agent.successRate * 100)),
                )}
              </p>
              {agent.sampleSize > 0 && (
                <p className="text-[10px] text-caption-accessible">
                  {t('overview.agent.sample').replace('{count}', String(agent.sampleSize))}
                  {agent.recentFailures > 0 &&
                    ` · ${t('overview.agent.failures').replace('{count}', String(agent.recentFailures))}`}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
