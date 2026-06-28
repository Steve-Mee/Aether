import { Clock, Download } from 'lucide-react';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { adminRepository } from '@/lib/data';
import { formatDate, t } from '@/lib/i18n';
import { env } from '@/lib/config';
import { apiRoutes } from '@/lib/api/routes';
import {
  AsyncBoundary,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui';
import { aetherErrorMessage, useAetherQuery } from '@/lib/query/hooks';
import { queryTiming } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import type {
  ExplainEntityType,
  ExplainabilityDiff,
  ExplainabilitySection,
  ExplainabilitySectionItem,
  ExplainTimelineEvent,
  SimilarActionRef,
} from '@/types/explainability';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import ExplainabilityDiffPanel from './ExplainabilityDiffPanel';
import { apiFetch } from '@/lib/api/client';

const AgentFlowDiagram = lazy(() => import('./AgentFlowDiagram'));

interface AgentExplainabilitySheetProps {
  entityType: ExplainEntityType;
  entityId: string;
  open: boolean;
  onClose: () => void;
  title?: string;
  onOpenSimilar?: (entityType: ExplainEntityType, entityId: string) => void;
}

export default function AgentExplainabilitySheet({
  entityType,
  entityId,
  open,
  onClose,
  title,
  onOpenSimilar,
}: AgentExplainabilitySheetProps) {
  const { settings } = useMerchantSettings();
  const detailOff = settings.explainabilityPrefs?.detailLevel === 'off';
  const [similarTarget, setSimilarTarget] = useState<{
    type: ExplainEntityType;
    id: string;
  } | null>(null);
  const [activeDiff, setActiveDiff] = useState<ExplainabilityDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const activeType = similarTarget?.type ?? entityType;
  const activeId = similarTarget?.id ?? entityId;

  const query = useAetherQuery(
    queryKeys.explain(activeType, activeId),
    () => adminRepository.explainTimeline(activeType, activeId),
    {
      enabled: open && Boolean(entityId) && !detailOff,
      staleTime: queryTiming.drawerStale,
      gcTime: queryTiming.drawerGc,
      meta: { domain: 'admin' },
      refetchInterval: (q) => {
        const data = q.state.data;
        if (data?.llmSummaryPending) return 5000;
        return false;
      },
    },
  );

  useEffect(() => {
    if (!open) {
      setSimilarTarget(null);
      setActiveDiff(null);
    }
  }, [open, entityId]);

  const loadDiff = async (rightType: string, rightId: string) => {
    setDiffLoading(true);
    try {
      const diff = await apiFetch<ExplainabilityDiff>(
        apiRoutes.admin.explainDiff(entityType, entityId, rightType, rightId),
      );
      setActiveDiff(diff);
    } catch {
      setActiveDiff(null);
    } finally {
      setDiffLoading(false);
    }
  };

  const timeline = query.data ?? null;
  const loading = query.isLoading;
  const error = aetherErrorMessage(query.error);

  const exportUrl = (format: 'json' | 'pdf') =>
    apiRoutes.admin.explainExport(entityType, entityId, format);
  const canExport =
    settings.dataExportEnabled &&
    !env.isMockMode &&
    entityType !== 'email' &&
    entityType !== 'approval';

  if (detailOff) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-md p-0 gap-0"
        aria-describedby={undefined}
      >
        <SheetHeader className="p-4 border-b border-border space-y-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/65">
            {t('explain.title')}
          </p>
          <SheetTitle>{title ?? t('command.result.explain')}</SheetTitle>
        </SheetHeader>

        <div className="p-4 overflow-y-auto flex-1">
          <AsyncBoundary loading={loading} error={error} onRetry={() => void query.refetch()}>
            {timeline && (
              <div className="space-y-6">
                {timeline.summary && (
                  <div className="space-y-2">
                    <span className="inline-flex text-[10px] uppercase tracking-wide rounded-md border border-border/50 px-1.5 py-0.5 text-muted-foreground">
                      {timeline.summarySource === 'llm'
                        ? t('explain.summary.ai')
                        : t('explain.summary.system')}
                    </span>
                    {timeline.llmSummaryPending && (
                      <p className="text-xs text-muted-foreground italic">
                        {t('explain.summary.enriching')}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {timeline.summary}
                    </p>
                  </div>
                )}

                {timeline.detailLevel === 'extended' && timeline.flowGraph && (
                  <section aria-labelledby="explain-flow">
                    <h3
                      id="explain-flow"
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3"
                    >
                      {t('explain.flow.title')}
                    </h3>
                    <Suspense fallback={<div className="h-32 animate-pulse bg-muted/40 rounded" />}>
                      <AgentFlowDiagram graph={timeline.flowGraph} height={180} />
                    </Suspense>
                  </section>
                )}

                {timeline.sections && timeline.sections.length > 0
                  ? timeline.sections
                      .filter((s: ExplainabilitySection) => s.id !== 'flow')
                      .map((section: ExplainabilitySection) => (
                        <section key={section.id} aria-labelledby={`explain-${section.id}`}>
                          <h3
                            id={`explain-${section.id}`}
                            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3"
                          >
                            {section.title}
                          </h3>
                          <ul className="space-y-3">
                            {section.items.map((item: ExplainabilitySectionItem, i: number) => (
                              <li key={`${section.id}-${i}`} className="flex gap-3 text-sm">
                                <Clock
                                  size={16}
                                  className="text-muted-foreground shrink-0 mt-0.5"
                                  aria-hidden
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground">{item.label}</p>
                                  {item.detail && (
                                    <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                                      {item.detail}
                                    </p>
                                  )}
                                  {item.meta && (
                                    <p className="mt-0.5 text-muted-foreground/70 text-[10px]">
                                      {item.meta}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))
                  : timeline.events &&
                    timeline.events.length > 0 && (
                      <ul className="space-y-4">
                        {timeline.events.map((event: ExplainTimelineEvent, i: number) => (
                          <li key={`${event.at}-${i}`} className="flex gap-3 text-sm">
                            <Clock
                              size={16}
                              className="text-muted-foreground shrink-0 mt-0.5"
                              aria-hidden
                            />
                            <div>
                              <p className="font-medium text-foreground">{event.label}</p>
                              <p className="text-muted-foreground text-xs">
                                {formatDate(event.at)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                {activeDiff && (
                  <ExplainabilityDiffPanel diff={activeDiff} onClose={() => setActiveDiff(null)} />
                )}
                {diffLoading && (
                  <p className="text-xs text-muted-foreground italic">
                    {t('explain.diff.loading')}
                  </p>
                )}

                {timeline.similarActions && timeline.similarActions.length > 0 && (
                  <section aria-labelledby="explain-similar">
                    <h3
                      id="explain-similar"
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3"
                    >
                      {t('explain.similar.title')}
                    </h3>
                    <ul className="space-y-2">
                      {timeline.similarActions.map((sim: SimilarActionRef, idx: number) => (
                        <li key={sim.sourceId ?? sim.patternKey ?? `global-${idx}`}>
                          {sim.scope === 'global' ? (
                            <div className="rounded-md border border-border/40 p-2 text-sm bg-muted/10">
                              <p className="font-medium line-clamp-2">{sim.summary}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {t('explain.similar.global').replace(
                                  '{count}',
                                  String(sim.peerTenantCount ?? 0),
                                )}{' '}
                                · score {sim.similarityScore}
                              </p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="w-full text-left rounded-md border border-border/40 p-2 hover:bg-muted/30 text-sm"
                              onClick={() => {
                                if (!sim.sourceId) return;
                                void loadDiff(sim.sourceType, sim.sourceId);
                              }}
                            >
                              <p className="font-medium line-clamp-2">{sim.summary}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {sim.at ? formatDate(sim.at) : ''} · score {sim.similarityScore}
                              </p>
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </AsyncBoundary>
        </div>

        <div className="border-t border-border p-4 space-y-2">
          {canExport && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" asChild>
                <a href={exportUrl('json')} download>
                  <Download size={14} className="mr-1" />
                  {t('explain.export.json')}
                </a>
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1" asChild>
                <a href={exportUrl('pdf')} download>
                  <Download size={14} className="mr-1" />
                  {t('explain.export.pdf')}
                </a>
              </Button>
            </div>
          )}
          <Button type="button" variant="outline" className="w-full" onClick={onClose}>
            {t('activity.detail.close')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
