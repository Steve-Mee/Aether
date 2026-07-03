import React from 'react';
import { t } from '@/lib/i18n';
import type { ExplainabilityDiff } from '@/types/explainability';

interface ExplainabilityDiffPanelProps {
  diff: ExplainabilityDiff;
  onClose: () => void;
}

export default function ExplainabilityDiffPanel({ diff, onClose }: ExplainabilityDiffPanelProps) {
  return (
    <div
      className="rounded-lg border border-border/50 bg-muted/15 p-3 space-y-3"
      data-testid="explain-diff-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('explain.diff.title')}
        </p>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          {t('explain.diff.close')}
        </button>
      </div>

      {diff.narrativeHints.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {diff.narrativeHints.map((hint) => (
            <li key={hint}>• {hint}</li>
          ))}
        </ul>
      )}

      {diff.agents.added.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-muted-foreground mb-1">
            {t('explain.diff.agentsAdded')}
          </p>
          <p className="text-sm">{diff.agents.added.join(', ')}</p>
        </div>
      )}

      {diff.agents.removed.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-muted-foreground mb-1">
            {t('explain.diff.agentsRemoved')}
          </p>
          <p className="text-sm">{diff.agents.removed.join(', ')}</p>
        </div>
      )}

      {diff.dataSourcesAdded.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-muted-foreground mb-1">
            {t('explain.diff.dataAdded')}
          </p>
          <ul className="text-xs space-y-1">
            {diff.dataSourcesAdded.map((l) => (
              <li key={l}>+ {l}</li>
            ))}
          </ul>
        </div>
      )}

      {diff.reasoningAdded.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-muted-foreground mb-1">
            {t('explain.diff.reasoningAdded')}
          </p>
          <ul className="text-xs space-y-1">
            {diff.reasoningAdded.slice(0, 5).map((l) => (
              <li key={l}>+ {l}</li>
            ))}
          </ul>
        </div>
      )}

      {diff.flowGraph && (
        <div>
          <p className="text-[10px] uppercase text-muted-foreground mb-1">
            {t('explain.diff.flow')}
          </p>
          {diff.flowGraph.addedNodes.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('explain.diff.flowAdded')}:{' '}
              {diff.flowGraph.addedNodes.map((n) => n.label).join(', ')}
            </p>
          )}
          {diff.flowGraph.removedNodes.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('explain.diff.flowRemoved')}:{' '}
              {diff.flowGraph.removedNodes.map((n) => n.label).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
