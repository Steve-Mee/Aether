import type { SupplierMonitoringLabel, SupplierSyncSource } from './supplierOverviewTypes';

export function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export function parseAuditDetails(details: string | null): Record<string, unknown> {
  if (!details) return {};
  try {
    return JSON.parse(details) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function auditSupplierId(details: Record<string, unknown>): string | undefined {
  const id = details.supplierId;
  return typeof id === 'string' ? id : undefined;
}

export function isPriceDrop(changeType: string, payload: Record<string, unknown>): boolean {
  if (changeType !== 'price_change') return false;
  const oldPrice = Number(payload.oldPrice);
  const newPrice = Number(payload.newPrice);
  if (!Number.isFinite(oldPrice) || !Number.isFinite(newPrice)) return false;
  return newPrice < oldPrice;
}

export function isImportantChange(changeType: string, payload: Record<string, unknown>): boolean {
  if (changeType === 'stock_change') return true;
  if (changeType === 'new_product') return true;
  return isPriceDrop(changeType, payload);
}

export function deriveMonitoringLabel(
  status: string,
  autoSyncEnabled: boolean
): SupplierMonitoringLabel {
  if (status === 'disabled') return 'disabled';
  if (status === 'active' && autoSyncEnabled) return 'sync_on';
  if (status === 'active') return 'active';
  return 'disabled';
}

export function syncSourceFromActor(actor: string | null | undefined): SupplierSyncSource {
  if (actor === 'scheduler') return 'auto';
  if (!actor) return 'monitor';
  return 'monitor';
}
