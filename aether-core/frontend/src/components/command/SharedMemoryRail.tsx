import { useState } from 'react';
import AgentBadge from './AgentBadge';
import type { SharedMemoryEntry } from '@/types/command';

interface SharedMemoryRailProps {
  entries: SharedMemoryEntry[];
  defaultCollapsed?: boolean;
}

export default function SharedMemoryRail({
  entries,
  defaultCollapsed = true,
}: SharedMemoryRailProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (entries.length === 0) return null;

  return (
    <div
      className="rounded-md border border-border/40 bg-muted/20 px-2 py-1.5"
      data-testid="shared-memory-rail"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-xs font-medium text-muted-foreground"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span>Shared memory ({entries.length})</span>
        <span aria-hidden>{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <ul className="mt-2 space-y-2" role="list">
          {entries.map((entry) => (
            <li
              key={`${entry.namespace}/${entry.key}`}
              className="rounded border border-border/30 bg-background/60 px-2 py-1.5 text-xs"
              role="listitem"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {entry.namespace}/{entry.key}
                </span>
                {entry.updatedByAgentKey && (
                  <AgentBadge agentKey={entry.updatedByAgentKey} size="sm" />
                )}
              </div>
              {entry.valuePreview && (
                <pre className="mt-1 max-h-16 overflow-hidden whitespace-pre-wrap break-all text-[10px] text-muted-foreground">
                  {entry.valuePreview}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
