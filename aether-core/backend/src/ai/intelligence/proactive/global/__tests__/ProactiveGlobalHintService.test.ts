import { ProactiveGlobalHintService } from '../ProactiveGlobalHintService';

jest.mock('../../proactiveConfig', () => ({
  isProactiveGlobalPatternsEnabled: jest.fn(() => true),
}));

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    globalAgentPattern: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('../../../global-knowledge/agent-patterns/AgentPatternContributionGate', () => ({
  AgentPatternContributionGate: jest.fn().mockImplementation(() => ({
    isEnabled: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../../../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: jest.fn().mockResolvedValue({ brainKnowledgeTransferEnabled: true }),
}));

describe('ProactiveGlobalHintService', () => {
  it('returns null when no patterns exist', async () => {
    const service = new ProactiveGlobalHintService();
    const hint = await service.getHint('t1', 'inventory.low_stock');
    expect(hint).toBeNull();
  });
});
