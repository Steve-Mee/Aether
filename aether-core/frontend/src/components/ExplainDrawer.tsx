import { Clock } from 'lucide-react';
import React from 'react';
import { adminRepository } from '@/lib/data';
import { formatDate, t } from '../lib/i18n';
import { AsyncBoundary, Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui';
import { aetherErrorMessage, useAetherQuery } from '@/lib/query/hooks';
import { queryTiming } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

export interface ExplainTimeline {
  entityType: string;
  entityId: string;
  events: Array<{
    at: string;
    label: string;
    status?: string;
    module?: string;
    actor?: string;
    category?: string;
    actionType?: string;
    details?: unknown;
  }>;
}

interface ExplainDrawerProps {
  entityType: 'email' | 'approval';
  entityId: string;
  open: boolean;
  onClose: () => void;
}

export default function ExplainDrawer({ entityType, entityId, open, onClose }: ExplainDrawerProps) {
  const query = useAetherQuery(
    queryKeys.explain(entityType, entityId),
    () => adminRepository.explainTimeline(entityType, entityId),
    {
      enabled: open && Boolean(entityId),
      staleTime: queryTiming.drawerStale,
      gcTime: queryTiming.drawerGc,
      meta: { domain: 'admin' },
    },
  );

  const timeline = query.data ?? null;
  const loading = query.isLoading;
  const error = aetherErrorMessage(query.error);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-md p-0 gap-0"
        aria-describedby={undefined}
      >
        <SheetHeader className="p-4 border-b border-border space-y-0">
          <SheetTitle>{t('command.result.explain')}</SheetTitle>
        </SheetHeader>

        <div className="p-4 overflow-y-auto flex-1">
          <AsyncBoundary loading={loading} error={error} onRetry={() => void query.refetch()}>
            {timeline && (
              <ul className="space-y-4">
                {timeline.events.map((event, i) => (
                  <li key={`${event.at}-${i}`} className="flex gap-3 text-sm">
                    <Clock
                      size={16}
                      className="text-muted-foreground shrink-0 mt-0.5"
                      aria-hidden
                    />
                    <div>
                      <p className="font-medium text-foreground">{event.label}</p>
                      <p className="text-muted-foreground text-xs">{formatDate(event.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AsyncBoundary>
        </div>
      </SheetContent>
    </Sheet>
  );
}
