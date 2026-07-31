import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, TextField } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { commerceApi } from '@/features/commerce';
import { formatCurrency, t } from '@/lib/i18n';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';
import { moduleLinks } from '@/lib/navigation/moduleLinks';

export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [carrier, setCarrier] = useState('PostNL');
  const [tracking, setTracking] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [approvalId, setApprovalId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => commerceApi.getOrder(id),
    enabled: Boolean(id),
  });

  const order = query.data;

  const ship = useMutation({
    mutationFn: () => commerceApi.shipOrder(id, { carrier, trackingNumber: tracking }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.order(id) }),
  });

  const refund = useMutation({
    mutationFn: () =>
      commerceApi.refundOrder(id, {
        amount: Number(refundAmount) || order?.total || 0,
        reason: 'merchant dashboard',
      }),
    onSuccess: (result) => {
      setApprovalId(result.approval?.id ?? null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.order(id) });
    },
  });

  return (
    <ModulePageLayout
      title={order ? `${t('nav.orders')} / ${order.id.slice(0, 8)}` : t('nav.orderDetail')}
      subtitle={t('orders.detail.subtitle')}
      featureKey="order-management"
      testId="order-detail-page"
      loading={query.isLoading}
      error={aetherErrorMessage(query.error)}
      onRetry={() => void query.refetch()}
    >
      <div className="mb-4">
        <Link
          to="/orders"
          className="text-sm text-muted-foreground hover:text-foreground"
          aria-label={t('nav.orders')}
        >
          ← {t('nav.orders')}
        </Link>
      </div>

      {!query.isLoading && !order && !query.error ? (
        <p className="text-sm text-muted-foreground" role="status" data-testid="order-empty">
          {t('orders.detail.notFound') || 'Order not found.'}
        </p>
      ) : null}

      {order ? (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="px-3 py-1 rounded-full text-xs bg-muted/40"
              data-testid="order-status-chip"
              role="status"
              aria-label={`${t('orders.detail.subtitle')}: ${order.status}`}
            >
              {order.status}
            </span>
            <span className="text-sm text-muted-foreground">{formatCurrency(order.total)}</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-2">
              <h2 className="text-sm font-medium">{t('orders.detail.customer')}</h2>
              {order.customer ? (
                <div className="text-sm text-muted-foreground">
                  <div>{order.customer.name}</div>
                  <div>{order.customer.email}</div>
                  <Link
                    to={`/customers/${order.customer.id}`}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {t('orders.detail.viewCustomer')}
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-medium">{t('orders.detail.payment')}</h2>
              {order.payment ? (
                <div className="text-sm text-muted-foreground">
                  <div>{order.payment.paymentMethod || '—'}</div>
                  <div>
                    {order.payment.status} · {formatCurrency(order.payment.amount)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('orders.detail.noPayment')}</p>
              )}
            </section>
          </div>

          <section>
            <h2 className="text-sm font-medium mb-3">{t('orders.detail.lineItems')}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-widest">
                  <th className="py-2">Product</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">{t('products.col.price')}</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t border-border/40">
                    <td className="py-3">{item.productId}</td>
                    <td className="py-3">{item.quantity}</td>
                    <td className="py-3">{formatCurrency(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="space-y-3" data-testid="order-fulfillment">
            <h2 className="text-sm font-medium">{t('orders.detail.fulfillment')}</h2>
            {order.shipments.map((s) => (
              <div key={s.id} className="text-sm text-muted-foreground">
                {s.carrier} · {s.trackingNumber} · {s.status}
              </div>
            ))}
            <div className="flex flex-wrap gap-2 items-end">
              <label className="block space-y-1 text-sm" htmlFor="order-ship-carrier">
                <span>{t('orders.detail.carrier')}</span>
                <TextField
                  id="order-ship-carrier"
                  data-testid="order-ship-carrier"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm" htmlFor="order-ship-tracking">
                <span>{t('orders.detail.tracking')}</span>
                <TextField
                  id="order-ship-tracking"
                  data-testid="order-ship-tracking"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                />
              </label>
              <Button
                data-testid="order-ship-submit"
                disabled={!tracking.trim() || ship.isPending}
                onClick={() => ship.mutate()}
              >
                {t('orders.detail.ship')}
              </Button>
            </div>
          </section>

          <section className="space-y-3" data-testid="order-refund">
            <h2 className="text-sm font-medium">{t('orders.detail.refund')}</h2>
            <div className="flex flex-wrap gap-2 items-end">
              <label className="block space-y-1 text-sm" htmlFor="order-refund-amount">
                <span>{t('orders.detail.refundAmount')}</span>
                <TextField
                  id="order-refund-amount"
                  data-testid="order-refund-amount"
                  type="number"
                  value={refundAmount}
                  placeholder={String(order.total)}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </label>
              <Button
                data-testid="order-refund-submit"
                variant="secondary"
                disabled={refund.isPending}
                onClick={() => refund.mutate()}
              >
                {t('orders.detail.refund')}
              </Button>
            </div>
            {approvalId ? (
              <p className="text-sm" data-testid="order-refund-approval">
                {t('orders.detail.approvalCreated')}{' '}
                <Link to={moduleLinks.approvals} className="underline underline-offset-2">
                  {t('nav.approvals')}
                </Link>
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </ModulePageLayout>
  );
}
