import React, { lazy, Suspense, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { LiveExplainState } from '@/types/explainability';

const AgentFlowDiagram = lazy(() => import('./AgentFlowDiagram'));

interface LiveExplainPanelProps {
  live: LiveExplainState | null;
  handoffChainLength?: number;
}

export default function LiveExplainPanel({ live, handoffChainLength = 0 }: LiveExplainPanelProps) {
  const [open, setOpen] = useState(true);

  if (!live?.summary && !live?.flowGraph && handoffChainLength <= 1) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden"
      data-testid="live-explain-panel"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{t('explain.live.title')}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {live?.summary && (
            <p className="text-xs text-muted-foreground leading-relaxed">{live.summary}</p>
          )}
          {live?.flowGraph && live.flowGraph.nodes.length > 0 && (
            <Suspense fallback={<div className="h-24 animate-pulse bg-muted/40 rounded" />}>
              <AgentFlowDiagram graph={live.flowGraph} height={140} />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
}
