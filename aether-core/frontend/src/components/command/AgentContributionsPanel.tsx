import { useState } from 'react';
import AgentBadge from './AgentBadge';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import type { ActionConflict, AgentContribution } from '@/types/command';
import { t } from '@/lib/i18n';

interface AgentContributionsPanelProps {
  contributions: AgentContribution[];
  conflicts?: ActionConflict[];
}

export default function AgentContributionsPanel({
  contributions,
  conflicts,
}: AgentContributionsPanelProps) {
  const [open, setOpen] = useState(false);

  if (contributions.length <= 1) return null;

  return (
    <div className="mt-3" data-testid="agent-contributions-panel">
      {conflicts && conflicts.length > 0 && (
        <div
          className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"
          role="alert"
        >
          <p className="font-medium">{t('command.brain.actionConflict')}</p>
          <ul className="mt-1 list-disc pl-4">
            {conflicts.map((c, i) => (
              <li key={i}>{c.description}</li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {t('command.brain.agentContributions')} ({contributions.length}){open ? ' ▾' : ' ▸'}
      </button>
      {open && (
        <ul className="mt-2 space-y-2">
          {contributions.map((c) => (
            <li
              key={c.agentKey}
              className="rounded-lg border border-border/30 bg-muted/10 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 mb-1">
                <AgentBadge agentKey={c.agentKey} size="sm" />
                {c.status === 'failed' && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {t('command.brain.agentFailed')}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground leading-relaxed">{c.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function agentsWorkingParallelLabel(keys: string[]): string {
  if (keys.length === 0) return '';
  if (keys.length === 1) {
    return `${agentDisplayLabel(keys[0]!)} ${t('command.brain.agentWorkingSuffix')}`;
  }
  const names = keys
    .map((k) => agentDisplayLabel(k))
    .join(` ${t('command.brain.andConjunction')} `);
  return t('command.brain.agentsWorkingParallel').replace('{agents}', names);
}
