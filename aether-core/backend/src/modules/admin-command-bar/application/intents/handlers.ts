import type { IntentHandler } from './types';

export const priceUpdateHandler: IntentHandler = {
  intent: 'PRICE_UPDATE',
  async execute(_nl, parameters, ctx, deps) {
    const pct = (parameters?.percentage as number) ?? 0;
    const updated = await deps.adminData.updateProductPrices(ctx.tenantId, pct);
    return {
      result: `Updated prices on ${updated} products by ${pct}%`,
      operationalMeta: { source: 'admin.price_update', updatedCount: updated },
    };
  },
};

export const lowMarginReportHandler: IntentHandler = {
  intent: 'LOW_MARGIN_REPORT',
  async execute(_nl, _params, ctx, deps) {
    const count = await deps.adminData.countLowMarginProducts(ctx.tenantId);
    return { result: `Found ${count} products with margin indicators below threshold` };
  },
};

export const approveChangesHandler: IntentHandler = {
  intent: 'APPROVE_CHANGES',
  async execute(_nl, _params, ctx, deps) {
    const pending = await deps.adminData.listPendingApprovals(ctx.tenantId, [
      'aether-mail',
      'supplier-intelligence',
    ]);
    const lowRisk = pending.filter((a) => {
      try {
        const payload = JSON.parse(a.payload ?? '{}') as { riskLevel?: string };
        return payload.riskLevel !== 'high';
      } catch {
        return false;
      }
    });
    if (lowRisk.length === 0) {
      return {
        result: 'No low-risk pending approvals to approve. High-risk items require individual review.',
      };
    }
    const approved = await deps.adminData.approveLowRisk(
      ctx.tenantId,
      lowRisk.map((a) => a.id),
      ctx.actorId
    );
    return {
      result: `Approved ${approved} low-risk pending changes (${pending.length - lowRisk.length} high-risk skipped)`,
    };
  },
};

export const inventoryStatusHandler: IntentHandler = {
  intent: 'INVENTORY_STATUS',
  async execute(_nl, _params, ctx, deps) {
    const items = await deps.adminData.listInventoryItems(ctx.tenantId);
    const low = items.filter((i) => i.quantity < 10);
    return { result: `Inventory: ${items.length} SKUs tracked, ${low.length} low-stock` };
  },
};

export const orderStatusHandler: IntentHandler = {
  intent: 'ORDER_STATUS',
  async execute(_nl, _params, ctx, deps) {
    const orders = await deps.adminData.listRecentOrders(ctx.tenantId);
    return {
      result: `Recent orders: ${orders.length} — latest status ${orders[0]?.status ?? 'none'}`,
    };
  },
};

export const emailSummaryHandler: IntentHandler = {
  intent: 'EMAIL_SUMMARY',
  async execute(_nl, _params, ctx, deps) {
    const unread = await deps.adminData.countEmailsByStatus(ctx.tenantId, ['received', 'escalated']);
    const replied = await deps.adminData.countEmailsByStatus(ctx.tenantId, ['replied']);
    return { result: `Mail: ${unread} awaiting action, ${replied} auto-replied` };
  },
};

export const outcomesReportHandler: IntentHandler = {
  intent: 'OUTCOMES_REPORT',
  async execute(_nl, _params, ctx, deps) {
    const { computeIncrementalRevenueUplift } = await import('../../../../ai/attribution/OutcomeEngine');
    const billable = await deps.adminData.countOutcomesByStatus(ctx.tenantId, 'billable');
    const uplift = await computeIncrementalRevenueUplift(ctx.tenantId);
    return { result: `Outcomes: ${billable} billable records, verified uplift €${uplift.toFixed(2)}` };
  },
};

export const pendingApprovalsHandler: IntentHandler = {
  intent: 'PENDING_APPROVALS',
  async execute(_nl, _params, ctx, deps) {
    const pending = await deps.adminData.countPendingApprovals(ctx.tenantId);
    return { result: `${pending} approvals pending review` };
  },
};

export const forecastHandler: IntentHandler = {
  intent: 'FORECAST',
  async execute(_nl, _params, ctx, deps) {
    const count = await deps.adminData.countForecasts(ctx.tenantId);
    return {
      result: `Demand forecasts on file: ${count}. Run POST /api/predictive/forecast for new predictions.`,
    };
  },
};

export const supplierCreateHandler: IntentHandler = {
  intent: 'SUPPLIER_CREATE',
  async execute(naturalLanguage, _params, ctx, deps) {
    const nameMatch = naturalLanguage.match(/supplier\s+([a-z0-9.-]+)/i);
    const website = nameMatch ? `https://${nameMatch[1]}` : 'https://example-supplier.com';
    const created = await deps.adminData.createSupplier(
      ctx.tenantId,
      nameMatch?.[1] ?? 'New Supplier',
      website
    );
    return { result: `Created supplier ${created.name} (${created.id})` };
  },
};

export const outcomeVerifyHandler: IntentHandler = {
  intent: 'OUTCOME_VERIFY',
  async execute(_nl, _params, ctx, deps) {
    const { verifyOutcomeWithEvidence } = await import(
      '../../../../shared/outcomes/OutcomeVerificationService'
    );
    const latest = await deps.adminData.findLatestProposedOutcome(ctx.tenantId);
    if (!latest) return { result: 'No proposed outcomes to verify' };
    const verification = await verifyOutcomeWithEvidence(latest.id, ctx.tenantId, 'verified', {
      method: 'causal_uplift',
      confidence: latest.confidence,
      actorId: ctx.actorId,
    });
    if (!verification.success) return { result: `Verification blocked: ${verification.reason}` };
    return { result: `Verified outcome ${latest.id} (${latest.metric}) with causal evidence` };
  },
};

export const supplierMonitorHandler: IntentHandler = {
  intent: 'SUPPLIER_MONITOR',
  async execute(_nl, _params, ctx, deps) {
    const suppliers = await deps.adminData.listSuppliers(ctx.tenantId);
    let monitored = 0;
    for (const s of suppliers) {
      await deps.supplierMonitor.monitorSupplier(s.id, {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
      });
      monitored += 1;
    }
    return { result: `Monitored ${monitored} suppliers` };
  },
};

export const ALL_INTENT_HANDLERS: IntentHandler[] = [
  priceUpdateHandler,
  lowMarginReportHandler,
  approveChangesHandler,
  inventoryStatusHandler,
  orderStatusHandler,
  emailSummaryHandler,
  outcomesReportHandler,
  pendingApprovalsHandler,
  forecastHandler,
  supplierCreateHandler,
  outcomeVerifyHandler,
  supplierMonitorHandler,
];
