import { Clock } from 'lucide-react';
import React from 'react';
import { adminRepository } from '@/lib/data';
import { formatDate, t } from '../lib/i18n';
import { AsyncBoundary, Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui';
import { aetherErrorMessage, useAetherQuery } from '@/lib/query/hooks';
import { queryTiming } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

interface AutonomyTraceDrawerProps {
  open: boolean;
  onClose: () => void;
  decisionTitle?: string;
  decisionDetail?: string;
}

export default function AutonomyTraceDrawer({
  open,
  onClose,
  decisionTitle,
  decisionDetail,
}: AutonomyTraceDrawerProps) {
  const query = useAetherQuery(
    queryKeys.autonomyTrace(30),
    () => adminRepository.autonomyTrace(30),
    {
      enabled: open,
      staleTime: queryTiming.drawerStale,
      gcTime: queryTiming.drawerGc,
      meta: { domain: 'admin' },
    },
  );

  const trace = query.data ?? null;
  const loading = query.isLoading;
  const error = aetherErrorMessage(query.error);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-md p-0 gap-0"
        aria-describedby={decisionDetail ? 'autonomy-trace-detail' : undefined}
      >
        <SheetHeader className="p-4 border-b border-border text-left space-y-1">
          <SheetTitle>{t('autonomous.trace')}</SheetTitle>
          {decisionTitle && (
            <p className="text-sm text-muted-foreground font-normal">{decisionTitle}</p>
          )}
        </SheetHeader>

        <div className="p-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {decisionDetail && (
            <p id="autonomy-trace-detail" className="text-sm text-muted-foreground mb-4">
              {decisionDetail}
            </p>
          )}
          <AsyncBoundary loading={loading} error={error} onRetry={() => void query.refetch()}>
            {trace && (
              <ul className="space-y-4" role="list">
                {trace.events.map((event, i) => (
                  <li key={`${event.at ?? i}-${i}`} className="flex gap-3 text-sm">
                    <Clock
                      size={16}
                      className="text-muted-foreground shrink-0 mt-0.5"
                      aria-hidden
                    />
                    <div>
                      <p className="font-medium text-foreground">
                        {event.label ?? event.kind ?? t('autonomous.trace')}
                      </p>
                      {event.at && (
                        <p className="text-muted-foreground text-xs">{formatDate(event.at)}</p>
                      )}
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
