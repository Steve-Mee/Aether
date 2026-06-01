jest.mock('../shared/prisma/client', () => ({
  prisma: {
    workflowRun: { create: jest.fn().mockResolvedValue({ id: 'run_test' }) },
    workflowStep: { create: jest.fn().mockResolvedValue({ id: 'step_test' }) },
  },
}));

jest.mock('../bootstrap/compositionRoot', () => ({
  getCompositionRoot: jest.fn(() => ({
    emailRepository: {
      findById: jest.fn().mockResolvedValue({
        id: 'em_1',
        status: 'received',
        from: 'a@b.com',
        subject: null,
        body: null,
        riskLevel: null,
        createdAt: new Date(),
      }),
    },
    processIncomingEmailUseCase: { execute: jest.fn() },
    monitorSupplierUseCase: { execute: jest.fn() },
    executeNaturalLanguageCommand: { execute: jest.fn() },
    respondToOffer: { execute: jest.fn() },
  })),
}));

import { AIOrchestrator } from '../ai/orchestrator/Orchestrator';
import { eventBus } from '../shared/events/eventBus';
import { writeAuditLog } from '../shared/audit/auditService';

jest.mock('../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

describe('AIOrchestrator', () => {
  it('skips duplicate event publish when admin command already executed', async () => {
    const orchestrator = new AIOrchestrator();
    const result = await orchestrator.execute({
      tenantId: 'tenant_default',
      task: 'admin.command',
      input: { intent: 'TEST', command: 'test' },
    });
    expect(result.success).toBe(true);
    expect(result.events).toEqual([]);
    expect(result.runId).toBe('run_test');
    expect(result.policy).toBeDefined();
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalled();
  });

  it('publishes mail.processed for mail.classify with email context', async () => {
    const orchestrator = new AIOrchestrator();
    const result = await orchestrator.execute({
      tenantId: 'tenant_default',
      task: 'mail.classify',
      input: { emailId: 'em_1', category: 'support' },
    });
    expect(result.events).toContain('mail.processed');
    expect(eventBus.publish).toHaveBeenCalled();
  });
});
