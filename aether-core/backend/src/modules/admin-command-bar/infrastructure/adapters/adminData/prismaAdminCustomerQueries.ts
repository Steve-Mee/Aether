import { prisma } from '../../../../../shared/prisma/client';
import { requireTenantId } from '../../../../../shared/tenant/tenantContext';
import {
  ChurnSignalsSummary,
  CustomerDetailRecord,
  CustomerSegmentKind,
  CustomerSegmentRecord,
  CustomerSegmentSummary,
  OrderTrendSummary,
  RecentOrderRecord,
  TopCustomerRecord,
} from '../../../application/ports/AdminDataPort';

export async function listRecentOrdersDetailed(tenantId: string, limit = 10): Promise<RecentOrderRecord[]> {
  const tid = requireTenantId(tenantId, 'AdminData.listRecentOrdersDetailed');
  const orders = await prisma.order.findMany({
    where: { tenantId: tid },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 50),
    select: { id: true, status: true, total: true, customerId: true },
  });
  return orders;
}

export async function listRecentOrders(tenantId: string, limit = 10) {
  const detailed = await listRecentOrdersDetailed(tenantId, limit);
  return detailed.map((o) => ({ status: o.status }));
}

export async function countCustomers(tenantId: string): Promise<number> {
  const tid = requireTenantId(tenantId, 'AdminData.countCustomers');
  return prisma.customer.count({ where: { tenantId: tid } });
}

export async function getTopCustomers(tenantId: string, limit = 10): Promise<TopCustomerRecord[]> {
  const tid = requireTenantId(tenantId, 'AdminData.getTopCustomers');
  const capped = Math.min(Math.max(limit, 1), 50);
  const customers = await prisma.customer.findMany({
    where: { tenantId: tid },
    take: capped * 3,
    include: {
      orders: {
        select: { total: true },
      },
    },
  });

  return customers
    .map((c) => {
      const orderCount = c.orders.length;
      const totalSpent = c.orders.reduce((sum, o) => sum + o.total, 0);
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
      return {
        id: c.id,
        email: c.email,
        name,
        orderCount,
        totalSpent: Math.round(totalSpent * 100) / 100,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent || b.orderCount - a.orderCount)
    .slice(0, capped);
}

export async function getOrderTrends(tenantId: string, days = 30): Promise<OrderTrendSummary> {
  const tid = requireTenantId(tenantId, 'AdminData.getOrderTrends');
  const windowDays = Math.min(Math.max(days, 7), 90);
  const now = Date.now();
  const recentSince = new Date(now - windowDays * 86400000);
  const priorSince = new Date(now - windowDays * 2 * 86400000);

  const [recentOrders, priorOrders] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId: tid, createdAt: { gte: recentSince } },
      select: { status: true },
    }),
    prisma.order.findMany({
      where: { tenantId: tid, createdAt: { gte: priorSince, lt: recentSince } },
      select: { status: true },
    }),
  ]);

  const statusBreakdown: Record<string, number> = {};
  for (const order of recentOrders) {
    statusBreakdown[order.status] = (statusBreakdown[order.status] ?? 0) + 1;
  }

  const recentCount = recentOrders.length;
  const priorCount = priorOrders.length;
  const trendPct =
    priorCount === 0
      ? recentCount > 0
        ? 100
        : 0
      : Math.round(((recentCount - priorCount) / priorCount) * 1000) / 10;

  return { recentCount, priorCount, trendPct, statusBreakdown };
}

export async function getCustomerSegments(tenantId: string, days = 90): Promise<CustomerSegmentSummary> {
  const tid = requireTenantId(tenantId, 'AdminData.getCustomerSegments');
  const now = Date.now();
  const newSince = new Date(now - 30 * 86400000);
  const atRiskCutoff = new Date(now - 60 * 86400000);

  const customers = await prisma.customer.findMany({
    where: { tenantId: tid },
    include: {
      orders: {
        select: { total: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const ranked = customers
    .map((c) => {
      const orderCount = c.orders.length;
      const totalSpent = c.orders.reduce((sum, o) => sum + o.total, 0);
      const lastOrderAt = c.orders[0]?.createdAt ?? null;
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
      return { id: c.id, email: c.email, name, orderCount, totalSpent, lastOrderAt, createdAt: c.createdAt };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent || b.orderCount - a.orderCount);

  const vipThresholdIndex = Math.max(1, Math.ceil(ranked.length * 0.1));
  const vipIds = new Set(ranked.slice(0, vipThresholdIndex).filter((c) => c.totalSpent > 0).map((c) => c.id));

  const counts = { vip: 0, atRisk: 0, new: 0, regular: 0 };
  const segments: CustomerSegmentRecord[] = [];

  for (const c of ranked) {
    let segment: CustomerSegmentKind;
    if (c.createdAt >= newSince && c.orderCount <= 1) {
      segment = 'new';
      counts.new += 1;
    } else if (vipIds.has(c.id)) {
      segment = 'vip';
      counts.vip += 1;
    } else if (c.orderCount > 0 && c.lastOrderAt && c.lastOrderAt < atRiskCutoff) {
      segment = 'at_risk';
      counts.atRisk += 1;
    } else if (c.orderCount === 0 && c.createdAt < atRiskCutoff) {
      segment = 'at_risk';
      counts.atRisk += 1;
    } else {
      segment = 'regular';
      counts.regular += 1;
    }

    segments.push({
      id: c.id,
      email: c.email,
      name: c.name,
      segment,
      orderCount: c.orderCount,
      totalSpent: Math.round(c.totalSpent * 100) / 100,
      lastOrderAt: c.lastOrderAt?.toISOString() ?? null,
    });
  }

  return {
    vip: counts.vip,
    atRisk: counts.atRisk,
    new: counts.new,
    regular: counts.regular,
    total: customers.length,
    segments: segments.slice(0, 50),
  };
}

export async function listCustomers(tenantId: string, days = 90): Promise<CustomerSegmentRecord[]> {
  const summary = await getCustomerSegments(tenantId, days);
  return summary.segments;
}

export async function getCustomerById(tenantId: string, customerId: string): Promise<CustomerDetailRecord | null> {
  const tid = requireTenantId(tenantId, 'AdminData.getCustomerById');
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: tid },
    include: {
      orders: {
        select: { total: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!customer) return null;

  const segments = await getCustomerSegments(tid, 90);
  const segmentRow = segments.segments.find((s) => s.id === customerId);
  const orderCount = customer.orders.length;
  const totalSpent = customer.orders.reduce((sum, o) => sum + o.total, 0);
  const lastOrderAt = customer.orders[0]?.createdAt ?? null;
  const daysSinceLastOrder = lastOrderAt
    ? Math.floor((Date.now() - lastOrderAt.getTime()) / 86400000)
    : null;
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;

  return {
    id: customer.id,
    email: customer.email,
    name,
    firstName: customer.firstName,
    lastName: customer.lastName,
    createdAt: customer.createdAt.toISOString(),
    orderCount,
    totalSpent: Math.round(totalSpent * 100) / 100,
    lastOrderAt: lastOrderAt?.toISOString() ?? null,
    segment: segmentRow?.segment ?? 'regular',
    churnRisk: segmentRow?.segment === 'at_risk' || (daysSinceLastOrder != null && daysSinceLastOrder > 60),
    daysSinceLastOrder,
  };
}

export async function getChurnSignals(tenantId: string, days = 30): Promise<ChurnSignalsSummary> {
  const tid = requireTenantId(tenantId, 'AdminData.getChurnSignals');
  const windowDays = Math.min(Math.max(days, 7), 90);
  const trends = await getOrderTrends(tid, windowDays);
  const segments = await getCustomerSegments(tid, 90);

  const now = Date.now();
  const atRiskCustomers = segments.segments
    .filter((s) => s.segment === 'at_risk')
    .slice(0, 20)
    .map((s) => {
      const lastMs = s.lastOrderAt ? new Date(s.lastOrderAt).getTime() : 0;
      const daysSinceLastOrder = lastMs > 0 ? Math.floor((now - lastMs) / 86400000) : 999;
      return { id: s.id, email: s.email, name: s.name, daysSinceLastOrder };
    });

  const negativeStatuses = ['cancelled', 'canceled', 'refunded', 'returned'];
  let negativeCount = 0;
  for (const [status, count] of Object.entries(trends.statusBreakdown)) {
    if (negativeStatuses.includes(status.toLowerCase())) {
      negativeCount += Number(count);
    }
  }
  const cancelledOrRefundedRatio =
    trends.recentCount === 0 ? 0 : Math.round((negativeCount / trends.recentCount) * 1000) / 10;

  const decliningTrend = trends.trendPct < -10;
  const atRiskCount = segments.atRisk;
  const suggestedActions: string[] = [];
  if (atRiskCount >= 3) suggestedActions.push('outreach_campaign');
  if (decliningTrend) suggestedActions.push('review_pricing', 'retention_offer');
  if (cancelledOrRefundedRatio > 15) suggestedActions.push('investigate_returns');

  return {
    atRiskCount,
    decliningTrend,
    trendPct: trends.trendPct,
    cancelledOrRefundedRatio,
    recentOrderCount: trends.recentCount,
    priorOrderCount: trends.priorCount,
    atRiskCustomers,
    suggestedActions,
  };
}
