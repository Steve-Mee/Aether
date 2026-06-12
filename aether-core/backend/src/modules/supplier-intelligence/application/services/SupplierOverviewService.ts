import { PrismaClient } from '@prisma/client';
import type { SupplierStatus } from '../../domain/entities/Supplier';

export type SupplierMonitoringLabel = 'active' | 'sync_on' | 'disabled';

export type SupplierSyncSource = 'monitor' | 'webhook' | 'auto';

export interface SupplierOverviewRow {
  id: string;
  name: string;
  website: string;
  supplierType: string | null;
  status: SupplierStatus;
  autoSyncEnabled: boolean;
  productCount: number;
  lastSyncAt: string | null;
  lastAutoSyncAt: string | null;
  recentChangeCount: number;
  hasRecentPriceDrop: boolean;
  hasRecentStockChange: boolean;
  hasRecentImportantChange: boolean;
  monitoringLabel: SupplierMonitoringLabel;
}

export interface SupplierOverviewStats {
  totalMonitored: number;
  activeAutoSyncs: number;
  syncsCompletedThisMonth: number;
  priceDropsThisMonth: number;
  autonomousPriceAdjustments: number;
}

export interface SupplierOverviewResponse {
  stats: SupplierOverviewStats;
  suppliers: SupplierOverviewRow[];
}

export interface SupplierChangeDetail {
  id: string;
  changeType: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
}

export interface SupplierProductDetail {
  id: string;
  sku: string;
  name: string;
  currentPrice: number;
  stock: number;
  lastUpdated: string;
}

export interface SupplierSyncHistoryItem {
  id: string;
  at: string;
  source: SupplierSyncSource;
  actor: string | null;
  label: string;
  productsFound?: number;
  changeCount?: number;
}

export interface SupplierDetailResponse {
  id: string;
  name: string;
  website: string;
  supplierType: string | null;
  status: SupplierStatus;
  autoSyncEnabled: boolean;
  productCount: number;
  lastSyncAt: string | null;
  lastAutoSyncAt: string | null;
  recentChanges: SupplierChangeDetail[];
  recentProducts: SupplierProductDetail[];
  recentSyncs: SupplierSyncHistoryItem[];
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function parseAuditDetails(details: string | null): Record<string, unknown> {
  if (!details) return {};
  try {
    return JSON.parse(details) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function auditSupplierId(details: Record<string, unknown>): string | undefined {
  const id = details.supplierId;
  return typeof id === 'string' ? id : undefined;
}

function isPriceDrop(changeType: string, payload: Record<string, unknown>): boolean {
  if (changeType !== 'price_change') return false;
  const oldPrice = Number(payload.oldPrice);
  const newPrice = Number(payload.newPrice);
  if (!Number.isFinite(oldPrice) || !Number.isFinite(newPrice)) return false;
  return newPrice < oldPrice;
}

function isImportantChange(changeType: string, payload: Record<string, unknown>): boolean {
  if (changeType === 'stock_change') return true;
  if (changeType === 'new_product') return true;
  return isPriceDrop(changeType, payload);
}

function deriveMonitoringLabel(
  status: string,
  autoSyncEnabled: boolean
): SupplierMonitoringLabel {
  if (status === 'disabled') return 'disabled';
  if (status === 'active' && autoSyncEnabled) return 'sync_on';
  if (status === 'active') return 'active';
  return 'disabled';
}

function syncSourceFromActor(actor: string | null | undefined): SupplierSyncSource {
  if (actor === 'scheduler') return 'auto';
  if (!actor) return 'monitor';
  return 'monitor';
}

export class SupplierOverviewService {
  constructor(private prisma: PrismaClient) {}

  private async loadSyncSignals(tenantId: string, monthStart: Date, supplierIds: string[]) {
    const [measureAudits, webhookEvents, domainEvents] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          module: 'supplier-intelligence',
          action: 'autonomy_measure',
          createdAt: { gte: monthStart },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      supplierIds.length > 0
        ? this.prisma.supplierWebhookEvent.findMany({
            where: { tenantId, supplierId: { in: supplierIds } },
            orderBy: { createdAt: 'desc' },
            take: 200,
          })
        : [],
      this.prisma.domainEvent.findMany({
        where: {
          tenantId,
          type: 'supplier.sync_completed',
          createdAt: { gte: monthStart },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    return { measureAudits, webhookEvents, domainEvents };
  }

  async getOverview(tenantId: string): Promise<SupplierOverviewResponse> {
    const monthStart = startOfMonth();
    const weekStart = daysAgo(7);

    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
        products: { select: { lastUpdated: true } },
      },
    });

    const supplierIds = suppliers.map((s) => s.id);

    const [changesWeek, changesMonth, syncSignals, approvalsMonth] = await Promise.all([
      supplierIds.length > 0
        ? this.prisma.supplierChange.findMany({
            where: { tenantId, supplierId: { in: supplierIds }, createdAt: { gte: weekStart } },
          })
        : [],
      supplierIds.length > 0
        ? this.prisma.supplierChange.findMany({
            where: { tenantId, supplierId: { in: supplierIds }, createdAt: { gte: monthStart } },
          })
        : [],
      this.loadSyncSignals(tenantId, monthStart, supplierIds),
      this.prisma.approval.count({
        where: {
          tenantId,
          module: 'supplier-intelligence',
          status: 'approved',
          actionType: 'price_change',
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    const { measureAudits, webhookEvents } = syncSignals;

    let syncsCompletedThisMonth = 0;
    const lastAutoSyncBySupplier = new Map<string, Date>();

    for (const audit of measureAudits) {
      const details = parseAuditDetails(audit.details);
      const sid = auditSupplierId(details);
      if (!sid || !supplierIds.includes(sid)) continue;
      syncsCompletedThisMonth += 1;
      const prev = lastAutoSyncBySupplier.get(sid);
      if (!prev || audit.createdAt > prev) {
        lastAutoSyncBySupplier.set(sid, audit.createdAt);
      }
    }

    for (const e of webhookEvents) {
      if (!e.supplierId) continue;
      if (e.createdAt >= monthStart) syncsCompletedThisMonth += 1;
      const prev = lastAutoSyncBySupplier.get(e.supplierId);
      if (!prev || e.createdAt > prev) {
        lastAutoSyncBySupplier.set(e.supplierId, e.createdAt);
      }
    }

    const changesBySupplierWeek = new Map<string, typeof changesWeek>();
    for (const c of changesWeek) {
      const list = changesBySupplierWeek.get(c.supplierId) ?? [];
      list.push(c);
      changesBySupplierWeek.set(c.supplierId, list);
    }

    const lastWebhookBySupplier = new Map<string, Date>();
    for (const e of webhookEvents) {
      if (!e.supplierId) continue;
      if (!lastWebhookBySupplier.has(e.supplierId)) {
        lastWebhookBySupplier.set(e.supplierId, e.createdAt);
      }
    }

    let priceDropsThisMonth = 0;
    for (const c of changesMonth) {
      try {
        const payload = JSON.parse(c.payload) as Record<string, unknown>;
        if (isPriceDrop(c.changeType, payload)) priceDropsThisMonth++;
      } catch {
        /* ignore malformed payload */
      }
    }

    const rows: SupplierOverviewRow[] = suppliers.map((s) => {
      const weekChanges = changesBySupplierWeek.get(s.id) ?? [];
      let hasRecentPriceDrop = false;
      let hasRecentStockChange = false;
      let hasRecentImportantChange = false;

      for (const c of weekChanges) {
        try {
          const payload = JSON.parse(c.payload) as Record<string, unknown>;
          if (isPriceDrop(c.changeType, payload)) hasRecentPriceDrop = true;
          if (c.changeType === 'stock_change') hasRecentStockChange = true;
          if (isImportantChange(c.changeType, payload)) hasRecentImportantChange = true;
        } catch {
          /* ignore */
        }
      }

      const productDates = s.products.map((p) => p.lastUpdated);
      const maxProductSync =
        productDates.length > 0
          ? new Date(Math.max(...productDates.map((d) => d.getTime())))
          : null;
      const webhookSync = lastWebhookBySupplier.get(s.id) ?? null;
      let lastSyncAt: Date | null = maxProductSync;
      if (webhookSync && (!lastSyncAt || webhookSync > lastSyncAt)) {
        lastSyncAt = webhookSync;
      }

      const autoSync = lastAutoSyncBySupplier.get(s.id) ?? null;
      const lastAutoSyncAt = autoSync ?? lastSyncAt;

      return {
        id: s.id,
        name: s.name,
        website: s.website,
        supplierType: s.supplierType,
        status: s.status as SupplierStatus,
        autoSyncEnabled: s.autoSyncEnabled,
        productCount: s._count.products,
        lastSyncAt: lastSyncAt ? lastSyncAt.toISOString() : null,
        lastAutoSyncAt: lastAutoSyncAt ? lastAutoSyncAt.toISOString() : null,
        recentChangeCount: weekChanges.length,
        hasRecentPriceDrop,
        hasRecentStockChange,
        hasRecentImportantChange,
        monitoringLabel: deriveMonitoringLabel(s.status, s.autoSyncEnabled),
      };
    });

    const totalMonitored = suppliers.filter((s) => s.status === 'active').length;
    const activeAutoSyncs = suppliers.filter(
      (s) => s.status === 'active' && s.autoSyncEnabled
    ).length;

    return {
      stats: {
        totalMonitored,
        activeAutoSyncs,
        syncsCompletedThisMonth,
        priceDropsThisMonth,
        autonomousPriceAdjustments: approvalsMonth,
      },
      suppliers: rows,
    };
  }

  async getSyncHistory(
    tenantId: string,
    supplierId: string,
    limit = 5
  ): Promise<SupplierSyncHistoryItem[]> {
    const [audits, webhooks] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          module: 'supplier-intelligence',
          action: 'autonomy_measure',
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.supplierWebhookEvent.findMany({
        where: { tenantId, supplierId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    const items: SupplierSyncHistoryItem[] = [];

    for (const audit of audits) {
      const details = parseAuditDetails(audit.details);
      if (auditSupplierId(details) !== supplierId) continue;
      items.push({
        id: audit.id,
        at: audit.createdAt.toISOString(),
        source: syncSourceFromActor(audit.actor),
        actor: audit.actor,
        label: 'monitor',
        productsFound:
          typeof details.productsFound === 'number' ? details.productsFound : undefined,
        changeCount:
          typeof details.changeCount === 'number' ? details.changeCount : undefined,
      });
    }

    for (const w of webhooks) {
      items.push({
        id: w.id,
        at: w.createdAt.toISOString(),
        source: 'webhook',
        actor: null,
        label: 'webhook',
      });
    }

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return items.slice(0, limit);
  }

  async getDetail(tenantId: string, supplierId: string): Promise<SupplierDetailResponse | null> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      include: {
        products: { orderBy: { lastUpdated: 'desc' }, take: 10 },
        _count: { select: { products: true } },
      },
    });
    if (!supplier) return null;

    const [recentChanges, recentSyncs] = await Promise.all([
      this.prisma.supplierChange.findMany({
        where: { tenantId, supplierId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      this.getSyncHistory(tenantId, supplierId, 5),
    ]);

    const lastWebhook = await this.prisma.supplierWebhookEvent.findFirst({
      where: { tenantId, supplierId },
      orderBy: { createdAt: 'desc' },
    });

    const productDates = supplier.products.map((p) => p.lastUpdated);
    const maxProductSync =
      productDates.length > 0
        ? new Date(Math.max(...productDates.map((d) => d.getTime())))
        : null;
    let lastSyncAt: Date | null = maxProductSync;
    if (lastWebhook && (!lastSyncAt || lastWebhook.createdAt > lastSyncAt)) {
      lastSyncAt = lastWebhook.createdAt;
    }

    const lastAutoSyncAt =
      recentSyncs.length > 0 ? new Date(recentSyncs[0].at) : lastSyncAt;

    return {
      id: supplier.id,
      name: supplier.name,
      website: supplier.website,
      supplierType: supplier.supplierType,
      status: supplier.status as SupplierStatus,
      autoSyncEnabled: supplier.autoSyncEnabled,
      productCount: supplier._count.products,
      lastSyncAt: lastSyncAt ? lastSyncAt.toISOString() : null,
      lastAutoSyncAt: lastAutoSyncAt ? lastAutoSyncAt.toISOString() : null,
      recentChanges: recentChanges.map((c) => ({
        id: c.id,
        changeType: c.changeType,
        payload: JSON.parse(c.payload) as Record<string, unknown>,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      })),
      recentProducts: supplier.products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        currentPrice: p.currentPrice,
        stock: p.stock,
        lastUpdated: p.lastUpdated.toISOString(),
      })),
      recentSyncs,
    };
  }
}
