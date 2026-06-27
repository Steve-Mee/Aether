import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface CustomerToolsDeps {
  adminData: AdminDataPort;
}

export function getCustomerOverviewTool(deps: CustomerToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getCustomerOverview',
      description: 'Get customer base overview: total customers and order trend summary',
      parameters: {
        days: { type: 'number', required: false, description: 'Trend window in days (default 30)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'customer-insights',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const days = Number(input.days ?? 30);
      const [customerCount, trends] = await Promise.all([
        deps.adminData.countCustomers(ctx.tenantId),
        deps.adminData.getOrderTrends(ctx.tenantId, days),
      ]);
      return {
        success: true,
        customerCount,
        orderTrends: trends,
        message: `${customerCount} customers; orders ${trends.recentCount} last ${days}d (${trends.trendPct >= 0 ? '+' : ''}${trends.trendPct}% vs prior period)`,
      };
    },
  };
}

export function getTopCustomersTool(deps: CustomerToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getTopCustomers',
      description: 'List top customers by total spend and order count',
      parameters: {
        limit: { type: 'number', required: false, description: 'Max customers (default 10)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'customer-insights',
    },
    validate(input) {
      const limit = Number(input.limit ?? 10);
      if (!Number.isFinite(limit) || limit < 1) {
        return { ok: false, error: 'limit must be >= 1' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const limit = Math.min(Number(input.limit ?? 10), 50);
      const customers = await deps.adminData.getTopCustomers(ctx.tenantId, limit);
      return {
        success: true,
        count: customers.length,
        customers,
      };
    },
  };
}

export function getOrderTrendsTool(deps: CustomerToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getOrderTrends',
      description: 'Analyze order volume trends and status breakdown for demand signals',
      parameters: {
        days: { type: 'number', required: false, description: 'Comparison window in days (default 30)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'customer-insights',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const days = Number(input.days ?? 30);
      const trends = await deps.adminData.getOrderTrends(ctx.tenantId, days);
      const declining = trends.trendPct < -10;
      const growing = trends.trendPct > 10;
      return {
        success: true,
        windowDays: days,
        ...trends,
        demandSignal: declining ? 'declining' : growing ? 'growing' : 'stable',
        suggestedActions: declining
          ? ['review_pricing', 'outreach_campaign']
          : growing
            ? ['ensure_inventory', 'review_pricing_upside']
            : [],
      };
    },
  };
}

export function getRecentOrdersTool(deps: CustomerToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getRecentOrders',
      description: 'List recent orders with status breakdown',
      parameters: {
        limit: { type: 'number', required: false, description: 'Max orders (default 10)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'customer-insights',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const limit = Math.min(Number(input.limit ?? 10), 50);
      const orders = await deps.adminData.listRecentOrdersDetailed(ctx.tenantId, limit);
      const statusBreakdown: Record<string, number> = {};
      for (const order of orders) {
        statusBreakdown[order.status] = (statusBreakdown[order.status] ?? 0) + 1;
      }
      return {
        success: true,
        count: orders.length,
        orders,
        statusBreakdown,
        message:
          orders.length > 0
            ? `Recent orders: ${orders.length} — latest status ${orders[0]?.status ?? 'none'}`
            : 'No recent orders',
      };
    },
  };
}
