import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, ModuleListPageSkeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { commerceApi } from '@/features/commerce';
import { formatCurrency, t } from '@/lib/i18n';
import { COMMAND_CENTER_PATH } from '@/lib/navigation/routes';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';
import { cn, interactiveSurface } from '@/lib/utils';

type SegmentFilter = 'all' | 'vip' | 'at_risk' | 'new' | 'regular';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [segment, setSegment] = useState<SegmentFilter>('all');

  const query = useQuery({
    queryKey: queryKeys.customers(),
    queryFn: () => commerceApi.listCustomers(),
  });

  const customers = useMemo(() => {
    const rows = query.data ?? [];
    if (segment === 'all') return rows;
    return rows.filter((c) => c.segment === segment);
  }, [query.data, segment]);

  return (
    <ModulePageLayout
      title={t('nav.customers')}
      subtitle={t('customers.subtitle')}
      featureKey="merchant-dashboard-commerce-ui"
      testId="customers-page"
      loading={query.isLoading}
      error={aetherErrorMessage(query.error)}
      onRetry={() => void query.refetch()}
      skeleton={<ModuleListPageSkeleton />}
    >
      <div className="flex flex-wrap gap-2 mb-4" data-testid="customers-segments">
        {(['all', 'vip', 'at_risk', 'new', 'regular'] as SegmentFilter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSegment(key)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg',
              segment === key ? 'bg-muted/50 text-foreground' : 'text-muted-foreground',
            )}
          >
            {t(`customers.segment.${key}`)}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border/40 rounded-aether overflow-x-auto">
        {customers.length === 0 ? (
          <EmptyState
            variant="premium"
            title={t('customers.empty')}
            description={t('customers.emptyDesc')}
            actionLabel={t('customers.empty.commandCenter')}
            onAction={() => void navigate(COMMAND_CENTER_PATH)}
          />
        ) : (
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs text-muted-foreground uppercase tracking-widest">
                <th className="px-8 py-5">{t('customers.col.name')}</th>
                <th className="px-8 py-5">{t('customers.col.email')}</th>
                <th className="px-8 py-5">{t('customers.col.orders')}</th>
                <th className="px-8 py-5">{t('customers.col.ltv')}</th>
                <th className="px-8 py-5">{t('customers.col.segment')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {customers.map((customer) => (
                <tr key={customer.id} className={cn(interactiveSurface(), 'hover:bg-surface-elevated/60')}>
                  <td className="px-8 py-6 font-medium">
                    <Link to={`/customers/${customer.id}`} className="hover:underline">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-8 py-6 text-muted-foreground">{customer.email}</td>
                  <td className="px-8 py-6 text-muted-foreground">{customer.orderCount}</td>
                  <td className="px-8 py-6 text-muted-foreground">
                    {formatCurrency(customer.totalSpent)}
                  </td>
                  <td className="px-8 py-6 text-muted-foreground">{customer.segment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ModulePageLayout>
  );
}
