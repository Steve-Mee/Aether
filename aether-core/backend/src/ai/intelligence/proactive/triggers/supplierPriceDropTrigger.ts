import { prisma } from '../../../../shared/prisma/client';
import type { ProactiveTriggerDefinition } from '../ProactiveTriggerDefinition';
import {
  PROACTIVE_DEFAULT_COOLDOWN_MS,
  PROACTIVE_SUPPLIER_DROP_PCT,
} from '../proactiveConfig';

export const supplierPriceDropTrigger: ProactiveTriggerDefinition = {
  id: 'supplier.price_drop',
  agentKey: 'supplier',
  category: 'leverancier',
  mode: 'event',
  eventType: 'supplier.price_changed',
  defaultRiskLevel: 'medium',
  cooldownMs: PROACTIVE_DEFAULT_COOLDOWN_MS,
  async evaluate(ctx) {
    const payload = ctx.eventPayload;
    const supplierId = String(payload?.supplierId ?? '');
    const changePct = Number(payload?.changePercent ?? 0);

    if (supplierId && changePct >= PROACTIVE_SUPPLIER_DROP_PCT) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, tenantId: ctx.tenantId },
        select: { name: true },
      });
      const name = supplier?.name ?? 'Leverancier';
      return [
        {
          triggerId: 'supplier.price_drop',
          dedupeKey: `supplier.price_drop:${supplierId}:${new Date().toISOString().slice(0, 10)}`,
          agentKey: 'supplier',
          title: `${name}: significante prijsdaling (${changePct.toFixed(1)}%) — herzie inkoop/marge`,
          summary: 'Supplier Agent detecteerde een prijsdaling bij leverancier.',
          command: `Check leverancier ${name} op prijsdalingen en stel actie voor`,
          intentId: 'SUPPLIER_CHECK',
          category: 'leverancier',
          riskLevel: 'medium',
          executionMode: 'approval_required',
          priority: 9,
          evidence: { supplierId, changePercent: changePct, supplierName: name },
        },
      ];
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentChanges = await prisma.supplierChange.findMany({
      where: {
        tenantId: ctx.tenantId,
        changeType: 'price_change',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const significant = recentChanges.filter((c) => {
      try {
        const parsed = JSON.parse(c.payload) as { change?: string; changePercent?: number };
        const pct =
          parsed.changePercent ??
          Math.abs(parseFloat(String(parsed.change ?? '0').replace('%', '')));
        return pct >= PROACTIVE_SUPPLIER_DROP_PCT;
      } catch {
        return false;
      }
    });

    if (significant.length === 0) return [];

    const bySupplier = new Map<string, number>();
    for (const change of significant) {
      bySupplier.set(change.supplierId, (bySupplier.get(change.supplierId) ?? 0) + 1);
    }

    const findings = [];
    for (const [sid, productCount] of bySupplier) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: sid, tenantId: ctx.tenantId },
        select: { name: true },
      });
      const name = supplier?.name ?? 'Leverancier';
      findings.push({
        triggerId: 'supplier.price_drop',
        dedupeKey: `supplier.price_drop:${sid}:${new Date().toISOString().slice(0, 10)}`,
        agentKey: 'supplier' as const,
        title: `${name}: ${productCount} product${productCount === 1 ? '' : 'en'} significant goedkoper — herzie inkoop/marge`,
        summary: 'Supplier Agent detecteerde recente prijsdalingen.',
        command: `Check leverancier ${name} op prijsdalingen en stel actie voor`,
        intentId: 'SUPPLIER_CHECK',
        category: 'leverancier',
        riskLevel: 'medium' as const,
        executionMode: 'approval_required' as const,
        priority: 9,
        evidence: { supplierId: sid, productCount, supplierName: name },
      });
    }
    return findings;
  },
};
