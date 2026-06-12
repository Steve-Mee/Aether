import React from 'react';
import { t, formatCurrency } from '../lib/i18n';
import { EmptyState, ModuleListPageSkeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { cn, interactiveSurface } from '@/lib/utils';
import { useProductsPage } from '@/hooks/useProductsPage';

export default function Products() {
  const { products, loading, error, reload } = useProductsPage();

  return (
    <ModulePageLayout
      title={t('nav.products')}
      subtitle={t('products.subtitle')}
      featureKey="product-catalog"
      testId="products-page"
      loading={loading}
      error={error}
      onRetry={reload}
      skeleton={<ModuleListPageSkeleton />}
    >
      <div className="bg-card border border-border/40 rounded-aether overflow-x-auto">
        {!products || products.length === 0 ? (
          <EmptyState
            variant="premium"
            title={t('products.empty')}
            description={t('products.emptyDesc')}
          />
        ) : (
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs text-muted-foreground uppercase tracking-widest">
                <th className="px-8 py-5">{t('products.col.name')}</th>
                <th className="px-8 py-5">{t('products.col.price')}</th>
                <th className="px-8 py-5">{t('products.col.stock')}</th>
                <th className="px-8 py-5">{t('products.col.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className={cn(interactiveSurface(), 'hover:bg-surface-elevated/60')}
                >
                  <td className="px-8 py-6 font-medium text-foreground">{product.name}</td>
                  <td className="px-8 py-6 text-muted-foreground">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-8 py-6 text-muted-foreground">{product.stock}</td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-success/20 text-success rounded-full text-xs">
                      {product.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ModulePageLayout>
  );
}
