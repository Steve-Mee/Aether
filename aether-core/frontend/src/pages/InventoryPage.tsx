import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, ModuleListPageSkeleton, TextField } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { commerceApi } from '@/features/commerce';
import { t } from '@/lib/i18n';
import { COMMAND_CENTER_PATH } from '@/lib/navigation/routes';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';

export default function InventoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [adjustProductId, setAdjustProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('0');

  const query = useQuery({
    queryKey: queryKeys.inventory(),
    queryFn: () => commerceApi.listInventory(),
  });

  const lowStockQuery = useQuery({
    queryKey: [...queryKeys.inventory(), 'low'],
    queryFn: () => commerceApi.listLowStock(),
  });

  const adjust = useMutation({
    mutationFn: () =>
      commerceApi.adjustInventory({
        productId: adjustProductId!,
        quantity: Number(quantity) || 0,
      }),
    onSuccess: () => {
      setAdjustProductId(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory() });
    },
  });

  const items = query.data ?? [];
  const lowCount = lowStockQuery.data?.length ?? items.filter((i) => i.status === 'low').length;

  return (
    <ModulePageLayout
      title={t('nav.inventory')}
      subtitle={t('inventory.subtitle')}
      featureKey="inventory-pricing"
      testId="inventory-page"
      loading={query.isLoading}
      error={aetherErrorMessage(query.error)}
      onRetry={() => void query.refetch()}
      skeleton={<ModuleListPageSkeleton />}
      headerExtra={
        <Button variant="secondary" onClick={() => void navigate(moduleLinks.approvals)}>
          {t('inventory.restockSuggest')}
        </Button>
      }
    >
      {lowCount > 0 ? (
        <div
          className="mb-4 px-4 py-3 rounded-aether border border-border/40 bg-muted/20 text-sm"
          data-testid="inventory-low-stock-banner"
        >
          {t('inventory.lowStockBanner').replace('{count}', String(lowCount))}
        </div>
      ) : null}

      <div className="bg-card border border-border/40 rounded-aether overflow-x-auto">
        {items.length === 0 ? (
          <EmptyState
            variant="premium"
            title={t('inventory.empty')}
            description={t('inventory.emptyDesc')}
            actionLabel={t('inventory.empty.commandCenter')}
            onAction={() => void navigate(COMMAND_CENTER_PATH)}
          />
        ) : (
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs text-muted-foreground uppercase tracking-widest">
                <th className="px-8 py-5">SKU / Product</th>
                <th className="px-8 py-5">{t('products.col.stock')}</th>
                <th className="px-8 py-5">{t('inventory.col.threshold')}</th>
                <th className="px-8 py-5">{t('products.col.status')}</th>
                <th className="px-8 py-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-8 py-6">
                    <Link
                      to={`/products/${item.productId}`}
                      className="font-medium hover:underline"
                    >
                      {item.productName ?? item.productId}
                    </Link>
                    <div className="text-xs text-muted-foreground">{item.warehouseId}</div>
                  </td>
                  <td className="px-8 py-6 text-muted-foreground">{item.quantity}</td>
                  <td className="px-8 py-6 text-muted-foreground">{item.threshold}</td>
                  <td className="px-8 py-6 text-muted-foreground">{item.status}</td>
                  <td className="px-8 py-6 text-right">
                    <Button
                      variant="secondary"
                      data-testid={`inventory-adjust-${item.productId}`}
                      onClick={() => {
                        setAdjustProductId(item.productId);
                        setQuantity(String(item.quantity));
                      }}
                    >
                      {t('inventory.adjust')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adjustProductId ? (
        <div
          className="mt-6 max-w-sm space-y-3 border border-border/40 rounded-aether p-4"
          data-testid="inventory-adjust-drawer"
        >
          <h2 className="text-sm font-medium">{t('inventory.adjustTitle')}</h2>
          <label className="block space-y-1 text-sm">
            <span>{t('products.col.stock')}</span>
            <TextField
              data-testid="inventory-adjust-qty"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button
              data-testid="inventory-adjust-submit"
              disabled={adjust.isPending}
              onClick={() => adjust.mutate()}
            >
              {t('inventory.adjustSubmit')}
            </Button>
            <Button variant="secondary" onClick={() => setAdjustProductId(null)}>
              {t('inventory.cancel')}
            </Button>
          </div>
        </div>
      ) : null}
    </ModulePageLayout>
  );
}
