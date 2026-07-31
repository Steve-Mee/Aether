import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t, formatCurrency } from '../lib/i18n';
import { Button, EmptyState, ModuleListPageSkeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { cn, interactiveSurface } from '@/lib/utils';
import { useProductsPage } from '@/hooks/useProductsPage';
import { COMMAND_CENTER_PATH } from '@/lib/navigation/routes';
import { moduleLinks } from '@/lib/navigation/moduleLinks';

export default function Products() {
  const navigate = useNavigate();
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
      headerExtra={
        <Button data-testid="products-new" onClick={() => void navigate(moduleLinks.productNew)}>
          {t('products.new.cta')}
        </Button>
      }
    >
      <div className="bg-card border border-border/40 rounded-aether overflow-x-auto">
        {!products || products.length === 0 ? (
          <EmptyState
            variant="premium"
            title={t('products.empty')}
            description={t('products.emptyDesc')}
            actionLabel={t('products.empty.commandCenter')}
            onAction={() => void navigate(COMMAND_CENTER_PATH)}
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
                  <td className="px-8 py-6 font-medium text-foreground">
                    <Link to={`/products/${product.id}`} className="hover:underline">
                      {product.name}
                    </Link>
                  </td>
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
