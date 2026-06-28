import AgentBadge from './AgentBadge';
import { humanizeHandoffReason } from '@/lib/agentDisplay';
import type { HandoffChainEntry } from '@/types/command';
import { t } from '@/lib/i18n';

interface HandoffChainRailProps {
  chain: HandoffChainEntry[];
}

function statusIcon(status?: HandoffChainEntry['status']): string {
  switch (status) {
    case 'pending':
    case 'running':
      return '⏳';
    case 'completed':
      return '✓';
    case 'failed':
      return '✗';
    default:
      return '→';
  }
}

export default function HandoffChainRail({ chain }: HandoffChainRailProps) {
  if (chain.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 py-1"
      data-testid="handoff-chain-rail"
      role="list"
      aria-label={t('command.brain.handoffChain')}
    >
      {chain.map((entry, index) => (
        <div
          key={`${entry.from}-${entry.to}-${entry.jobId ?? index}`}
          className="flex items-center gap-1"
          role="listitem"
        >
          {index > 0 && (
            <span className="text-muted-foreground/50 text-xs" aria-hidden>
              {t('command.brain.agentHandoffArrow')}
            </span>
          )}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <AgentBadge agentKey={entry.to} chainFrom={entry.from} size="sm" />
              {entry.messageType && (
              <span className="text-[10px] rounded border border-border/40 px-1 py-0 text-muted-foreground">
                {entry.messageType}
              </span>
            )}
            {entry.correlationId && (
              <span
                className="text-[10px] text-muted-foreground/50 font-mono"
                title={entry.correlationId}
              >
                #{entry.correlationId.slice(0, 6)}
              </span>
            )}
            {entry.handoffMode === 'direct' && (
                <span className="text-[10px] rounded border border-border/40 px-1 py-0 text-muted-foreground">
                  {t('command.brain.directPeerHandoff')}
                </span>
              )}
              {entry.mode === 'async' && (
                <span className="text-[10px] text-muted-foreground/70" title={entry.status}>
                  {statusIcon(entry.status)} {t('command.brain.asyncPeer')}
                </span>
              )}
            </div>
            {entry.reason && (
              <span className="text-[10px] text-muted-foreground/65 pl-0.5">
                {humanizeHandoffReason(entry.reason)}
              </span>
            )}
            {entry.summary && (
              <span className="text-[10px] text-muted-foreground/75 pl-0.5 line-clamp-2">
                {entry.summary}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function chainFromForAgent(chain: HandoffChainEntry[], activeAgentKey: string | null): string | undefined {
  if (!activeAgentKey) return undefined;
  const key = activeAgentKey.split(',')[0] ?? activeAgentKey;
  const match = [...chain].reverse().find((e) => e.to === key || e.to.split(',')[0] === key);
  return match?.from;
}

export function executionModeBadgeLabel(mode?: 'single' | 'sequential' | 'parallel'): string | null {
  if (!mode || mode === 'single') return null;
  return mode === 'parallel'
    ? t('command.brain.executionModeParallel')
    : t('command.brain.executionModeSequential');
}
