import { Badge } from '@/components/ui';
import {
  agentBadgeClass,
  agentDisplayLabel,
  agentHandoffLabel,
  agentWorkingLabel,
  formatAgentKeysLabel,
} from '@/lib/agentDisplay';
import { t } from '@/lib/i18n';

interface AgentBadgeProps {
  agentKey: string;
  delegatedFrom?: string;
  chainFrom?: string;
  size?: 'sm' | 'md';
}

export default function AgentBadge({
  agentKey,
  delegatedFrom,
  chainFrom,
  size = 'sm',
}: AgentBadgeProps) {
  const label = agentKey.includes(',')
    ? formatAgentKeysLabel(agentKey)
    : agentDisplayLabel(agentKey);
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5';

  return (
    <span className="inline-flex flex-col gap-0.5">
      <Badge
        className={`${agentBadgeClass(agentKey)} ${sizeClass} font-medium uppercase tracking-wide`}
      >
        {label}
      </Badge>
      {delegatedFrom && delegatedFrom !== agentKey && (
        <span className="text-[10px] text-muted-foreground/70">
          {t('command.brain.delegatedFrom')} {agentDisplayLabel(delegatedFrom)}
        </span>
      )}
      {chainFrom && chainFrom !== agentKey && (
        <span className="text-[10px] text-muted-foreground/70">
          {agentHandoffLabel(
            chainFrom,
            agentKey.split(',')[0] ?? agentKey,
            t('command.brain.agentHandoffArrow'),
          )}
        </span>
      )}
    </span>
  );
}
