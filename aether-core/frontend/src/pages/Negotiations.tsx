import React from 'react';
import { Handshake } from 'lucide-react';
import { EmptyState, ModuleListPageSkeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { t } from '@/lib/i18n';
import { interactiveSurface } from '@/lib/utils';
import { useNegotiationsPage } from '@/hooks/useNegotiationsPage';

export default function Negotiations() {
  const { items, loading, error, reload } = useNegotiationsPage();

  return (
    <ModulePageLayout
      title={t('negotiations.title')}
      subtitle={t('negotiations.subtitle')}
      featureKey="agentic-commerce"
      testId="negotiations-page"
      loading={loading}
      error={error}
      onRetry={reload}
      skeleton={<ModuleListPageSkeleton />}
    >
      {!items || items.length === 0 ? (
        <EmptyState
          variant="premium"
          title={t('negotiations.empty.title')}
          description={t('negotiations.empty.description')}
          icon={<Handshake size={32} />}
        />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={interactiveSurface(
                'rounded-2xl p-4 border border-border/40 bg-card/40 flex justify-between',
              )}
            >
              <div>
                <div className="text-body font-medium">{n.id.slice(0, 12)}…</div>
                <div className="text-meta text-muted-foreground">
                  {t('negotiations.product')}: {n.productId ?? '—'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-meta capitalize">{n.status}</div>
                <div className="text-body text-muted-foreground tabular-nums">
                  €{n.currentOffer?.toFixed(2) ?? '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModulePageLayout>
  );
}
