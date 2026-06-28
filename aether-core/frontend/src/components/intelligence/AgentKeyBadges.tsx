import AgentBadge from '@/components/command/AgentBadge';
import { cn } from '@/lib/utils';

interface AgentKeyBadgesProps {
  agentKeys: string[];
  maxVisible?: number;
  className?: string;
}

export default function AgentKeyBadges({
  agentKeys,
  maxVisible = 2,
  className,
}: AgentKeyBadgesProps) {
  if (!agentKeys.length) return null;

  const visible = agentKeys.slice(0, maxVisible);
  const overflow = agentKeys.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visible.map((key) => (
        <AgentBadge key={key} agentKey={key} size="sm" />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground font-medium">+{overflow}</span>
      )}
    </div>
  );
}
