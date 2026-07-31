import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, ModuleListPageSkeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { commerceApi } from '@/features/commerce';
import { formatCurrency, t } from '@/lib/i18n';
import { COMMAND_CENTER_PATH } from '@/lib/navigation/routes';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';

export default function PaymentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: queryKeys.paymentsSummary(),
    queryFn: () => commerceApi.getPaymentsSummary(),
  });

  const listQuery = useQuery({
    queryKey: queryKeys.paymentsList(),
    queryFn: () => commerceApi.listPayments(),
  });

  const payoutsQuery = useQuery({
    queryKey: queryKeys.paymentsPayouts(),
    queryFn: () => commerceApi.listPaymentPayouts(),
  });

  const reconcile = useMutation({
    mutationFn: () => commerceApi.reconcilePayments(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentsSummary() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentsList() });
    },
  });

  const summary = summaryQuery.data;
  const payments = listQuery.data ?? [];
  const loading = summaryQuery.isLoading || listQuery.isLoading || payoutsQuery.isLoading;
  const error = summaryQuery.error || listQuery.error || payoutsQuery.error;

  return (
    <ModulePageLayout
      title={t('nav.payments')}
      subtitle={t('payments.subtitle')}
      featureKey="payment-fulfillment"
      testId="payments-page"
      loading={loading}
      error={aetherErrorMessage(error)}
      onRetry={() => {
        void summaryQuery.refetch();
        void listQuery.refetch();
        void payoutsQuery.refetch();
      }}
      skeleton={<ModuleListPageSkeleton />}
      headerExtra={
        <Button
          variant="secondary"
          disabled={reconcile.isPending}
          onClick={() => reconcile.mutate()}
        >
          {t('payments.reconcile')}
        </Button>
      }
    >
      <p className="text-xs text-muted-foreground mb-4" data-testid="payments-honesty-note">
        {t('payments.honestyNote')}
      </p>

      <div className="grid gap-3 sm:grid-cols-3 mb-6" data-testid="payments-summary">
        <div className="rounded-aether border border-border/40 bg-card px-5 py-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t('payments.connect')}
          </div>
          <div className="mt-2 text-sm font-medium">
            {summary?.connectConfigured
              ? t('payments.connectConfigured')
              : t('payments.connectMissing')}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {t('payments.provider')}: {summary?.provider ?? '—'}
          </div>
        </div>
        <div className="rounded-aether border border-border/40 bg-card px-5 py-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t('payments.paidAmount')}
          </div>
          <div className="mt-2 text-sm font-medium">{formatCurrency(summary?.paidAmount ?? 0)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {summary?.paymentCount ?? 0} {t('payments.paymentCount')}
          </div>
        </div>
        <div className="rounded-aether border border-border/40 bg-card px-5 py-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t('payments.failed')}
          </div>
          <div className="mt-2 text-sm font-medium">{summary?.failedCount ?? 0}</div>
        </div>
      </div>

      {reconcile.data ? (
        <div
          className="mb-4 px-4 py-3 rounded-aether border border-border/40 bg-muted/20 text-sm"
          data-testid="payments-reconcile-result"
        >
          {t('payments.reconcileResult')
            .replace('{kind}', reconcile.data.kind)
            .replace('{count}', String(reconcile.data.reconciled))}
        </div>
      ) : null}
      {reconcile.isError ? (
        <p className="mb-4 text-sm text-destructive">{aetherErrorMessage(reconcile.error)}</p>
      ) : null}

      <h2 className="text-sm font-medium mb-2">{t('payments.transactions')}</h2>
      <div
        className="bg-card border border-border/40 rounded-aether overflow-x-auto mb-6"
        data-testid="payments-transactions"
      >
        {payments.length === 0 ? (
          <EmptyState
            variant="premium"
            title={t('payments.transactionsEmpty')}
            description={t('payments.transactionsEmptyDesc')}
            actionLabel={t('payments.empty.commandCenter')}
            onAction={() => void navigate(COMMAND_CENTER_PATH)}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs text-muted-foreground uppercase tracking-widest">
                <th className="px-6 py-4">{t('payments.col.id')}</th>
                <th className="px-6 py-4">{t('payments.col.order')}</th>
                <th className="px-6 py-4">{t('payments.col.amount')}</th>
                <th className="px-6 py-4">{t('payments.col.status')}</th>
                <th className="px-6 py-4">{t('payments.col.method')}</th>
                <th className="px-6 py-4">{t('payments.col.created')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border/20">
                  <td className="px-6 py-4 font-mono text-xs">{p.id}</td>
                  <td className="px-6 py-4 font-mono text-xs">{p.orderId}</td>
                  <td className="px-6 py-4">{formatCurrency(p.amount)}</td>
                  <td className="px-6 py-4">{p.status}</td>
                  <td className="px-6 py-4">{p.paymentMethod}</td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="text-sm font-medium mb-2">{t('payments.payoutsHeading')}</h2>
      <div className="bg-card border border-border/40 rounded-aether overflow-x-auto">
        <EmptyState
          variant="premium"
          title={t('payments.payoutsEmpty')}
          description={payoutsQuery.data?.message ?? t('payments.payoutsEmptyDesc')}
          actionLabel={t('payments.empty.commandCenter')}
          onAction={() => void navigate(COMMAND_CENTER_PATH)}
        />
      </div>
    </ModulePageLayout>
  );
}
