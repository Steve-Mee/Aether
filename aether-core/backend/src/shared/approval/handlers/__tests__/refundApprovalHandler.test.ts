import { RefundApprovalHandler } from '../refundApprovalHandler';

const executeApprovedRefund = jest.fn();
const updateRefundStatus = jest.fn();

jest.mock('../../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    paymentService: { executeApprovedRefund },
    orderRepository: { updateRefundStatus },
  }),
}));

jest.mock('../../../prisma/client', () => ({
  prisma: {
    auditLog: { findFirst: jest.fn().mockResolvedValue(null) },
  },
}));

jest.mock('../../../audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

const { prisma } = require('../../../prisma/client');
const { writeAuditLog } = require('../../../audit/auditService');

describe('RefundApprovalHandler', () => {
  const handler = new RefundApprovalHandler();

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.auditLog.findFirst.mockResolvedValue(null);
    executeApprovedRefund.mockResolvedValue(undefined);
    updateRefundStatus.mockResolvedValue({ id: 'ref_1', status: 'completed' });
  });

  it('handles payment-fulfillment refund', () => {
    expect(handler.canHandle('payment-fulfillment', 'refund')).toBe(true);
    expect(handler.canHandle('order-management', 'refund')).toBe(false);
  });

  it('executes payment refund and marks order refund completed', async () => {
    await handler.execute({
      tenantId: 'tenant_a',
      approvalId: 'appr_1',
      module: 'payment-fulfillment',
      actionType: 'refund',
      payload: {
        paymentId: 'pay_1',
        refundId: 'ref_1',
        orderId: 'ord_1',
        amount: 50,
      },
      resolvedBy: 'operator_1',
    });

    expect(executeApprovedRefund).toHaveBeenCalledWith('pay_1', {
      tenantId: 'tenant_a',
      amount: 50,
    });
    expect(updateRefundStatus).toHaveBeenCalledWith('ref_1', 'tenant_a', 'completed');
    expect(writeAuditLog).toHaveBeenCalled();
  });

  it('completes refund without paymentId when only refundId present', async () => {
    await handler.execute({
      tenantId: 'tenant_a',
      approvalId: 'appr_2',
      module: 'payment-fulfillment',
      actionType: 'refund',
      payload: { refundId: 'ref_2', orderId: 'ord_2', amount: 20 },
      resolvedBy: 'operator_1',
    });

    expect(executeApprovedRefund).not.toHaveBeenCalled();
    expect(updateRefundStatus).toHaveBeenCalledWith('ref_2', 'tenant_a', 'completed');
  });
});
