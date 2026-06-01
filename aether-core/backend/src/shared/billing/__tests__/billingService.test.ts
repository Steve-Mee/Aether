jest.mock('../../prisma/client', () => ({
  prisma: {
    billingRecord: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'bill_1',
        amount: 12,
        currency: 'EUR',
      }),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([
        { id: 'bill_1', amount: 12, reconciledAt: null, status: 'invoiced' },
      ]),
    },
  },
}));

jest.mock('../stripeBillingService', () => ({
  createSuccessFeeInvoiceDraft: jest.fn().mockResolvedValue({ invoiceId: 'inv_1', status: 'skipped' }),
}));

import { recordBillableOutcome, reconcileBillingRecords } from '../billingService';
import { prisma } from '../../prisma/client';

describe('billingService', () => {
  it('creates billing record for positive uplift', async () => {
    const result = await recordBillableOutcome('tenant_default', 'out_1', 100);
    expect(result).toEqual({ billingId: 'bill_1', amount: 12 });
    expect(prisma.billingRecord.create).toHaveBeenCalled();
  });

  it('reconciles pending invoiced records', async () => {
    const result = await reconcileBillingRecords('tenant_default');
    expect(result.reconciled).toBe(1);
    expect(prisma.billingRecord.update).toHaveBeenCalled();
  });
});
