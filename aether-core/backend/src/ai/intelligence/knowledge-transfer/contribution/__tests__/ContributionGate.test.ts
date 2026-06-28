import { DefaultContributionGate } from '../DefaultContributionGate';
import { prisma } from '../../../../../shared/prisma/client';

jest.mock('../../isKnowledgeTransferEnabled', () => ({
  isKnowledgeTransferEnabledEnv: jest.fn(),
}));

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    tenantSettings: {
      findUnique: jest.fn(),
    },
  },
}));

const { isKnowledgeTransferEnabledEnv } = jest.requireMock('../../isKnowledgeTransferEnabled');

describe('DefaultContributionGate', () => {
  const gate = new DefaultContributionGate();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks when env KT disabled', async () => {
    isKnowledgeTransferEnabledEnv.mockReturnValue(false);
    expect(await gate.canContribute('tenant_a')).toBe(false);
  });

  it('blocks receive_only tenants', async () => {
    isKnowledgeTransferEnabledEnv.mockReturnValue(true);
    (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
      brainKnowledgeTransferEnabled: null,
      brainKnowledgeGovernanceMode: 'receive_only',
    });
    expect(await gate.canContribute('tenant_a')).toBe(false);
  });

  it('allows contribute_only tenants', async () => {
    isKnowledgeTransferEnabledEnv.mockReturnValue(true);
    (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
      brainKnowledgeTransferEnabled: true,
      brainKnowledgeGovernanceMode: 'contribute_only',
    });
    expect(await gate.canContribute('tenant_a')).toBe(true);
  });

  it('shouldFederate requires federated opt-in', async () => {
    isKnowledgeTransferEnabledEnv.mockReturnValue(true);
    (prisma.tenantSettings.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        brainKnowledgeTransferEnabled: true,
        brainKnowledgeGovernanceMode: 'full_loop',
      })
      .mockResolvedValueOnce({ brainFederatedContributionEnabled: true });
    expect(await gate.shouldFederate('tenant_a')).toBe(true);
  });
});
