import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { commerceApi } from '@/features/commerce';
import { formatCurrency, t } from '@/lib/i18n';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';

export default function CustomerDetailPage() {
  const { id = '' } = useParams();

  const customerQuery = useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => commerceApi.getCustomer(id),
    enabled: Boolean(id),
  });

  const ordersQuery = useQuery({
    queryKey: queryKeys.customerOrders(id),
    queryFn: () => commerceApi.listCustomerOrders(id),
    enabled: Boolean(id),
  });

  const customer = customerQuery.data;

  return (
    <ModulePageLayout
      title={customer ? customer.name : t('nav.customerDetail')}
      subtitle={customer?.email ?? t('customers.detail.subtitle')}
      featureKey="merchant-dashboard-commerce-ui"
      testId="customer-detail-page"
      loading={customerQuery.isLoading}
      error={aetherErrorMessage(customerQuery.error)}
      onRetry={() => void customerQuery.refetch()}
    >
      <div className="mb-4">
        <Link to="/customers" className="text-sm text-muted-foreground hover:text-foreground">
          ← {t('nav.customers')}
        </Link>
      </div>

      {customer ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="customer-kpis">
            <Kpi label={t('customers.col.orders')} value={String(customer.orderCount)} />
            <Kpi label={t('customers.col.ltv')} value={formatCurrency(customer.totalSpent)} />
            <Kpi label={t('customers.col.segment')} value={customer.segment} />
            <Kpi
              label={t('customers.detail.churn')}
              value={customer.churnRisk ? t('customers.detail.atRisk') : t('customers.detail.ok')}
            />
          </div>

          <section>
            <h2 className="text-sm font-medium mb-3">{t('customers.detail.orders')}</h2>
            {ordersQuery.data && ordersQuery.data.length > 0 ? (
              <ul className="divide-y divide-border/40 border border-border/40 rounded-aether">
                {ordersQuery.data.map((order) => (
                  <li key={order.id} className="px-6 py-4 flex justify-between text-sm">
                    <Link to={`/orders/${order.id}`} className="font-medium hover:underline">
                      {order.id.slice(0, 10)}
                    </Link>
                    <span className="text-muted-foreground">{order.status}</span>
                    <span className="text-muted-foreground">{formatCurrency(order.total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('customers.detail.noOrders')}</p>
            )}
          </section>
        </div>
      ) : null}
    </ModulePageLayout>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border/40 rounded-aether px-4 py-3">
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="text-lg font-medium mt-1">{value}</div>
    </div>
  );
}
