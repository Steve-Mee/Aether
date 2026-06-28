import { formatDate, t } from '@/lib/i18n';
import type { SupplierListItem, SupplierStatusTab } from '@/types/supplier';

export function matchesSearch(item: SupplierListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.name.toLowerCase().includes(q) ||
    item.website.toLowerCase().includes(q) ||
    (formatSupplierType(item.supplierType).toLowerCase().includes(q) ?? false)
  );
}

export function matchesStatusTab(item: SupplierListItem, tab: SupplierStatusTab): boolean {
  switch (tab) {
    case 'all':
      return true;
    case 'active':
      return item.status === 'active';
    case 'inactive':
      return item.status === 'inactive' || item.status === 'disabled';
    case 'recent':
      return item.recentChangeCount > 0 || item.hasRecentImportantChange;
    default:
      return true;
  }
}

export function sortSuppliers(items: SupplierListItem[]): SupplierListItem[] {
  return [...items].sort((a, b) => {
    if (a.hasRecentImportantChange !== b.hasRecentImportantChange) {
      return a.hasRecentImportantChange ? -1 : 1;
    }
    if (a.hasRecentPriceDrop !== b.hasRecentPriceDrop) {
      return a.hasRecentPriceDrop ? -1 : 1;
    }
    if (a.recentChangeCount !== b.recentChangeCount) {
      return b.recentChangeCount - a.recentChangeCount;
    }
    return a.name.localeCompare(b.name);
  });
}

export function formatSupplierType(type: string | null): string {
  if (!type) return '';
  const key = `suppliers.type.${type}`;
  const label = t(key);
  return label === key ? type.replace(/_/g, ' ') : label;
}

export function formatChangeSummary(changeType: string, payload: Record<string, unknown>): string {
  if (changeType === 'price_change') {
    const sku = String(payload.sku ?? '');
    const oldP = Number(payload.oldPrice);
    const newP = Number(payload.newPrice);
    if (Number.isFinite(oldP) && Number.isFinite(newP)) {
      const pct = (((newP - oldP) / oldP) * 100).toFixed(1);
      return t('suppliers.change.price')
        .replace('{sku}', sku)
        .replace('{old}', oldP.toFixed(2))
        .replace('{new}', newP.toFixed(2))
        .replace('{pct}', pct);
    }
    return sku || changeType;
  }
  if (changeType === 'stock_change') {
    const sku = String(payload.sku ?? '');
    return t('suppliers.change.stock')
      .replace('{sku}', sku)
      .replace('{old}', String(payload.oldStock ?? '—'))
      .replace('{new}', String(payload.newStock ?? '—'));
  }
  if (changeType === 'new_product') {
    return t('suppliers.change.newProduct').replace(
      '{name}',
      String(payload.name ?? payload.sku ?? ''),
    );
  }
  return changeType;
}

export function formatSyncSourceLabel(source: string): string {
  const key = `suppliers.sync.source.${source}`;
  const label = t(key);
  return label === key ? source : label;
}

/** Relative phrase with absolute date in title attribute context */
export function formatSyncTime(iso: string | null): { relative: string; absolute: string } {
  if (!iso) {
    return { relative: t('suppliers.card.never'), absolute: '' };
  }
  const date = new Date(iso);
  const absolute = formatDate(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let relative: string;
  if (diffMins < 1) relative = t('suppliers.time.justNow');
  else if (diffMins < 60)
    relative = t('suppliers.time.minutesAgo').replace('{n}', String(diffMins));
  else if (diffHours < 24)
    relative = t('suppliers.time.hoursAgo').replace('{n}', String(diffHours));
  else if (diffDays < 7) relative = t('suppliers.time.daysAgo').replace('{n}', String(diffDays));
  else relative = absolute;

  return { relative, absolute };
}

export function isDemoSupplierId(id: string): boolean {
  return id.startsWith('demo_sup_');
}

import { env } from '@/lib/config';

export function isSuppliersDemoMode(): boolean {
  return env.suppliersDemo;
}
