import type { ChannelOrder, ChannelMetrics } from '../../domain/types';

export function aggregateOrderMetrics(
  orders: ChannelOrder[],
  start: Date,
  end: Date
): ChannelMetrics {
  const inRange = orders.filter((o) => o.createdAt >= start && o.createdAt <= end);
  const totalRevenue = inRange.reduce((sum, o) => sum + o.total, 0);
  return {
    totalOrders: inRange.length,
    totalRevenue,
    currency: inRange[0]?.currency ?? 'EUR',
    period: { start, end },
  };
}

export function normalizeShopifyHost(storeUrl: string): string {
  const trimmed = storeUrl.trim().replace(/\/+$/, '');
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
  if (!withoutProtocol.includes('.')) {
    return `${withoutProtocol}.myshopify.com`;
  }
  return withoutProtocol;
}

export function shopifyAdminBase(storeUrl: string): string {
  return `https://${normalizeShopifyHost(storeUrl)}`;
}
