import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  subscribeActivityItem,
  subscribeNotification,
  subscribeSupplierChange,
} from '@/lib/aetherLiveBus';
import { COMMAND_EXECUTED_EVENT } from '@/lib/data/commandEvents';
import { invalidateHomeLandingQueries } from './invalidateHomeLanding';
import { queryKeys } from './keys';

const INVALIDATION_DEBOUNCE_MS = 300;

function createDebouncedInvalidator(
  queryClient: ReturnType<typeof useQueryClient>,
  delayMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pending = new Set<() => void>();

  return (run: () => void) => {
    pending.add(run);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      for (const fn of pending) fn();
      pending.clear();
      timer = null;
    }, delayMs);
  };
}

/**
 * Bridges live bus events to TanStack Query cache invalidation.
 * Keeps data fresh without polling every endpoint.
 */
export default function QueryInvalidationBridge() {
  const queryClient = useQueryClient();
  const scheduleRef = useRef<ReturnType<typeof createDebouncedInvalidator> | null>(null);

  if (!scheduleRef.current) {
    scheduleRef.current = createDebouncedInvalidator(queryClient, INVALIDATION_DEBOUNCE_MS);
  }

  useEffect(() => {
    const schedule = scheduleRef.current!;

    const invalidateActivityInsights = () => {
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      void queryClient.invalidateQueries({ queryKey: ['aether-overview'] });
      invalidateHomeLandingQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.autonomyMetrics() });
    };

    const unsubs = [
      subscribeNotification(() => {
        schedule(() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
        });
      }),
      subscribeActivityItem(() => {
        schedule(invalidateActivityInsights);
      }),
      subscribeSupplierChange(() => {
        schedule(() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
          void queryClient.invalidateQueries({ queryKey: ['activity'] });
        });
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [queryClient]);

  useEffect(() => {
    const handler = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
    };
    window.addEventListener('aether:approvals-changed', handler);
    return () => window.removeEventListener('aether:approvals-changed', handler);
  }, [queryClient]);

  useEffect(() => {
    const schedule = scheduleRef.current!;
    const handler = () => {
      schedule(() => {
        void queryClient.invalidateQueries({ queryKey: ['activity'] });
        void queryClient.invalidateQueries({ queryKey: ['aether-overview'] });
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
        invalidateHomeLandingQueries(queryClient);
        void queryClient.invalidateQueries({ queryKey: queryKeys.autonomyMetrics() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.outcomes() });
        void queryClient.invalidateQueries({ queryKey: ['goals'] });
      });
    };
    window.addEventListener(COMMAND_EXECUTED_EVENT, handler);
    return () => window.removeEventListener(COMMAND_EXECUTED_EVENT, handler);
  }, [queryClient]);

  return null;
}
