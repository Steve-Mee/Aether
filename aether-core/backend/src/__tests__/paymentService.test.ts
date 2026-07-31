import { PaymentService } from '../modules/payment-fulfillment/application/services/PaymentService';
import { Payment } from '../modules/payment-fulfillment/domain/entities/Payment';
import { PaymentRepository } from '../modules/payment-fulfillment/domain/repositories/PaymentRepository';

jest.mock('../shared/prisma/client', () => ({
  prisma: {
    paymentIdempotency: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    payment: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

jest.mock('../shared/approval/approvalService', () => ({
  createApproval: jest.fn().mockResolvedValue({ id: 'appr_1' }),
}));

const mockRepo: jest.Mocked<PaymentRepository> = {
  listByTenant: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
  findByOrderId: jest.fn(),
};

const mockGateway = {
  processPayment: jest.fn().mockResolvedValue({ transactionId: 'tx_1', status: 'paid' }),
  refund: jest.fn().mockResolvedValue(undefined),
  toPaymentEntity: (_orderId: string, amount: number, paymentMethod: string, result: { status: string }) =>
    new Payment('pay_1', 'ord_1', amount, 'EUR', result.status as Payment['status'], paymentMethod, 'tx_1'),
};

describe('PaymentService', () => {
  const mockIdempotency = {
    findPaymentId: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const mockWebhook = {
    markPaidByTransaction: jest.fn().mockResolvedValue(undefined),
  };
  const service = new PaymentService(mockRepo, mockGateway, mockGateway, mockIdempotency, mockWebhook);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYMENT_PROVIDER = 'local';
  });

  it('processes payment via local provider', async () => {
    const payment = new Payment('pay_1', 'ord_1', 50, 'EUR', 'paid', 'card');
    mockRepo.create.mockResolvedValue(payment);

    const result = await service.processPayment('ord_1', 50, 'card', {
      tenantId: 'tenant_default',
    });

    expect(result.payment.status).toBe('paid');
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('creates approval for high-risk refund', async () => {
    const payment = new Payment('pay_1', 'ord_1', 500, 'EUR', 'paid', 'card');
    payment.transactionId = 'local_txn_1';
    mockRepo.findById.mockResolvedValue(payment);

    await service.refund('pay_1', { tenantId: 'tenant_default', amount: 500 });

    const { createApproval } = require('../shared/approval/approvalService');
    expect(createApproval).toHaveBeenCalled();
    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('acknowledges webhook and updates payment status', async () => {
    const result = await service.handleWebhook(
      'stripe',
      { status: 'paid', transactionId: 'pi_test_1' },
      'tenant_default'
    );
    expect(result.acknowledged).toBe(true);
    expect(mockWebhook.markPaidByTransaction).toHaveBeenCalledWith('tenant_default', 'pi_test_1');
  });
});
