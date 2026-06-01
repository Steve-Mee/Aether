import React from 'react';
import { apiFetch, ProductRow } from '../lib/api';
import { t, formatCurrency } from '../lib/i18n';
import FeatureStatusFromTruth from '../components/FeatureStatusFromTruth';
import AsyncBoundary from '../components/ui/AsyncBoundary';
import EmptyState from '../components/ui/EmptyState';
import { useAsyncData } from '../lib/useAsyncData';

export default function Products() {
  const { data: products, loading, error, reload } = useAsyncData(() =>
    apiFetch<ProductRow[]>('/api/products')
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-text)]">{t('nav.products')}</h1>
          <p className="text-[var(--color-text-muted)] mt-1">{t('products.subtitle')}</p>
        </div>
        <FeatureStatusFromTruth featureKey="product-catalog" />
      </div>

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-xl)] overflow-x-auto">
          {!products || products.length === 0 ? (
            <EmptyState title={t('products.empty')} description={t('products.emptyDesc')} />
          ) : (
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-left text-xs text-[var(--color-text-subtle)] uppercase tracking-widest">
                  <th className="px-8 py-5">{t('products.col.name')}</th>
                  <th className="px-8 py-5">{t('products.col.price')}</th>
                  <th className="px-8 py-5">{t('products.col.stock')}</th>
                  <th className="px-8 py-5">{t('products.col.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-[var(--color-surface-elevated)]/60">
                    <td className="px-8 py-6 font-medium text-[var(--color-text)]">{product.name}</td>
                    <td className="px-8 py-6 text-[var(--color-text-muted)]">{formatCurrency(product.price)}</td>
                    <td className="px-8 py-6 text-[var(--color-text-muted)]">{product.stock}</td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-[var(--color-success)]/20 text-[var(--color-success)] rounded-full text-xs">
                        {product.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </AsyncBoundary>
    </div>
  );
}
