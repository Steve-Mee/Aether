jest.mock('../../../shared/prisma/client', () => ({
  prisma: {
    customer: { findFirst: jest.fn().mockResolvedValue(null) },
    emailMessage: { count: jest.fn().mockResolvedValue(0) },
    order: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

jest.mock('../../../shared/approval/approvalService', () => ({
  createApproval: jest.fn().mockResolvedValue({ id: 'appr_1' }),
}));

jest.mock('../../../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../ai/orchestrator/Orchestrator', () => ({
  orchestrator: { execute: jest.fn().mockResolvedValue({ success: true }) },
}));

jest.mock('../infrastructure/smtp/SmtpClient', () => ({
  smtpClient: { send: jest.fn().mockResolvedValue({ sent: true, messageId: 'msg_1' }) },
}));

import { ProcessIncomingEmailUseCase } from '../application/use-cases/ProcessIncomingEmailUseCase';
import { EmailMessage } from '../domain/entities/EmailMessage';
import { EmailClassifierService } from '../application/services/EmailClassifierService';
import { EmailContextProvider } from '../application/services/EmailContextProvider';

const mockContextProvider = new EmailContextProvider({
  loadContext: jest.fn().mockResolvedValue({
    customerEmail: 'buyer@shop.com',
    customerName: null,
    recentOrderCount: 0,
    recentOrderTotal: 0,
    priorEmailCount: 0,
    source: 'fallback',
  }),
});

const mockMailSender = {
  send: jest.fn().mockResolvedValue({ sent: true, messageId: 'msg_1' }),
  isConfigured: jest.fn().mockReturnValue(false),
};

describe('ProcessIncomingEmailUseCase', () => {
  const mockRepo = {
    create: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
  };
  const classifier = new EmailClassifierService();

  beforeEach(() => {
    jest.clearAllMocks();
    const email = new EmailMessage(
      'email_1',
      'buyer@shop.com',
      'Order status',
      'Where is my order?',
      'received',
      'low',
      new Date()
    );
    mockRepo.create.mockResolvedValue(email);
    mockRepo.update.mockResolvedValue(email);
  });

  it('auto-replies for low-risk order_status emails', async () => {
    jest.spyOn(classifier, 'classify').mockResolvedValue({
      category: 'order_status',
      riskLevel: 'low',
      confidence: 0.9,
      reason: 'test',
      source: 'ollama',
    });

    const useCase = new ProcessIncomingEmailUseCase(mockRepo as any, classifier, mockMailSender, mockContextProvider);
    const result = await useCase.execute(
      { from: 'buyer@shop.com', subject: 'Order status', body: 'Where is my order?' },
      { tenantId: 'tenant_default' }
    );

    expect(result.autoSent).toBe(true);
    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'replied' })
    );
  });

  it('escalates high-risk emails to approval', async () => {
    jest.spyOn(classifier, 'classify').mockResolvedValue({
      category: 'complaint',
      riskLevel: 'high',
      confidence: 0.95,
      reason: 'test',
      source: 'ollama',
    });

    const useCase = new ProcessIncomingEmailUseCase(mockRepo as any, classifier, mockMailSender, mockContextProvider);
    const result = await useCase.execute(
      { from: 'buyer@shop.com', subject: 'Refund now', body: 'I want a refund' },
      { tenantId: 'tenant_default' }
    );

    expect(result.approvalId).toBe('appr_1');
    expect(mockRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'escalated' })
    );
  });

  it('escalates heuristic fallback even when low risk', async () => {
    jest.spyOn(classifier, 'classify').mockResolvedValue({
      category: 'simple_question',
      riskLevel: 'low',
      confidence: 0.55,
      reason: 'Heuristic fallback',
      source: 'heuristic',
    });

    const useCase = new ProcessIncomingEmailUseCase(mockRepo as any, classifier, mockMailSender, mockContextProvider);
    const result = await useCase.execute(
      { from: 'buyer@shop.com', subject: 'Hello', body: 'Quick question' },
      { tenantId: 'tenant_default' }
    );

    expect(result.approvalId).toBe('appr_1');
    expect(result.autoSent).toBeFalsy();
  });
});
