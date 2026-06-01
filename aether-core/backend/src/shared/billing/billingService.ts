import { prisma } from '../prisma/client';
import { logger } from '../logging/logger';
import { createSuccessFeeInvoiceDraft } from './stripeBillingService';

const SUCCESS_FEE_RATE = parseFloat(process.env.AETHER_SUCCESS_FEE_RATE ?? '0.12');

export async function recordBillableOutcome(
  tenantId: string,
  outcomeId: string,
  upliftAmount: number
): Promise<{ billingId: string; amount: number } | null> {
  if (upliftAmount <= 0) return null;

  const amount = Math.round(upliftAmount * SUCCESS_FEE_RATE * 100) / 100;
  const existing = await prisma.billingRecord.findFirst({
    where: { tenantId, outcomeId },
  });
  if (existing) {
    return { billingId: existing.id, amount: existing.amount };
  }

  const record = await prisma.billingRecord.create({
    data: {
      tenantId,
      outcomeId,
      amount,
      currency: 'EUR',
      status: 'pending',
    },
  });

  logger.info('billing_record_created', {
    tenantId,
    outcomeId,
    billingId: record.id,
    amount,
    feeRate: SUCCESS_FEE_RATE,
  });

  const invoice = await createSuccessFeeInvoiceDraft({
    tenantId,
    billingId: record.id,
    amount,
    currency: record.currency,
  });

  if (invoice.invoiceId && invoice.status === 'draft') {
    await prisma.billingRecord.update({
      where: { id: record.id },
      data: { status: 'invoiced', stripeInvoiceId: invoice.invoiceId },
    });
  }

  return { billingId: record.id, amount };
}

export async function getBillingSummary(tenantId: string, periodDays = 30) {
  const since = new Date(Date.now() - periodDays * 86400000);
  const records = await prisma.billingRecord.findMany({
    where: { tenantId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });
  return {
    periodDays,
    totalRecords: records.length,
    totalAmount: records.reduce((sum, r) => sum + r.amount, 0),
    reconciledCount: records.filter((r) => r.reconciledAt != null).length,
    records,
  };
}

export async function reconcileBillingRecords(tenantId: string): Promise<{
  reconciled: number;
  pending: number;
}> {
  const unreconciled = await prisma.billingRecord.findMany({
    where: { tenantId, reconciledAt: null, status: { in: ['invoiced', 'pending'] } },
  });

  let reconciled = 0;
  for (const record of unreconciled) {
    await prisma.billingRecord.update({
      where: { id: record.id },
      data: { status: 'reconciled', reconciledAt: new Date() },
    });
    reconciled += 1;
  }

  logger.info('billing_reconciliation_complete', { tenantId, reconciled });
  return { reconciled, pending: unreconciled.length - reconciled };
}
