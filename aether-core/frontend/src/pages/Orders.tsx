import { Package } from 'lucide-react';
import { t } from '../lib/i18n';
import { EmptyState, ModuleListPageSkeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { cn, interactiveSurface } from '@/lib/utils';
import { useOrdersPage } from '@/hooks/useOrdersPage';

export default function Orders() {
  const { orders, loading, error, reload } = useOrdersPage();

  return (
    <ModulePageLayout
      title={t('nav.orders')}
      featureKey="order-management"
      testId="orders-page"
      loading={loading}
      error={error}
      onRetry={reload}
      skeleton={<ModuleListPageSkeleton />}
    >
      {!orders || orders.length === 0 ? (
        <EmptyState
          variant="premium"
          title={t('orders.empty.title')}
          description={t('orders.empty.description')}
          icon={<Package size={32} />}
        />
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card/30 divide-y divide-border/40 overflow-hidden">
          {orders.map((order) => (
            <div
              key={order.id}
              className={cn(interactiveSurface(), 'p-6 flex justify-between hover:bg-card/50')}
            >
              <div>
                <p className="text-body font-medium">{order.id.slice(0, 8)}…</p>
                <p className="text-meta text-muted-foreground">{order.status}</p>
              </div>
              <div className="text-right">
                <p className="text-body font-medium tabular-nums">
                  {order.currency} {order.total.toFixed(2)}
                </p>
                <p className="text-caption text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModulePageLayout>
  );
}
