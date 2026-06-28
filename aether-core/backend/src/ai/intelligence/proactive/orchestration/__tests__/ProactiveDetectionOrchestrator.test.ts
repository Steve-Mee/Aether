import { ProactiveDetectionOrchestrator } from '../ProactiveDetectionOrchestrator';

jest.mock('../../proactiveConfig', () => ({
  isProactiveDetectionOrchestrationEnabled: jest.fn(() => false),
  resolveProactiveDetectionOrchMaxPerHour: jest.fn(() => 2),
}));

describe('ProactiveDetectionOrchestrator', () => {
  it('does not orchestrate when disabled', async () => {
    const repository = {
      updateOrchestration: jest.fn(),
      countActive: jest.fn(),
    };
    const orchestrator = new ProactiveDetectionOrchestrator(repository as never);
    await orchestrator.enqueue({
      id: 's1',
      tenantId: 't1',
      triggerId: 'inventory.low_stock',
      dedupeKey: 'k',
      agentKey: 'inventory',
      title: 'Low',
      summary: null,
      command: 'Check',
      intentId: 'RESTOCK_SUGGEST',
      category: 'voorraad',
      riskLevel: 'low',
      executionMode: 'autonomous',
      status: 'active',
      snoozedUntil: null,
      evidence: {},
      priority: 8,
      expiresAt: null,
      clusterKey: null,
      enrichedAt: null,
      enrichmentSource: null,
      detectionRunId: null,
      orchestrationSource: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(repository.updateOrchestration).not.toHaveBeenCalled();
  });
});
