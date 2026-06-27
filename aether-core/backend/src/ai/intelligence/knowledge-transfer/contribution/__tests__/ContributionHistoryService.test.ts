import { ContributionHistoryService } from '../ContributionHistoryService';
import { prisma } from '../../../../../shared/prisma/client';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    brainKnowledgeContributionLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    tenantSettings: {
      findUnique: jest.fn(),
    },
  },
}));

describe('ContributionHistoryService', () => {
  const service = new ContributionHistoryService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated history metadata', async () => {
    const createdAt = new Date('2026-06-01T12:00:00Z');
    (prisma.brainKnowledgeContributionLog.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'log1',
        source: 'tool_outcome',
        category: 'pricing',
        metric: 'auto_apply_rate',
        sampleSize: 3,
        submitted: true,
        rejectReason: null,
        createdAt,
      },
    ]);
    (prisma.brainKnowledgeContributionLog.count as jest.Mock).mockResolvedValue(1);

    const result = await service.getHistory('tenant_a', { limit: 10, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.entries[0]).toEqual({
      id: 'log1',
      source: 'tool_outcome',
      category: 'pricing',
      metric: 'auto_apply_rate',
      sampleSize: 3,
      submitted: true,
      rejectReason: null,
      createdAt: createdAt.toISOString(),
    });
  });

  it('returns 30-day summary with federated opt-in', async () => {
    const lastAt = new Date('2026-06-20T08:00:00Z');
    (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
      brainFederatedContributionEnabled: true,
    });
    (prisma.brainKnowledgeContributionLog.count as jest.Mock)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    (prisma.brainKnowledgeContributionLog.findFirst as jest.Mock).mockResolvedValue({
      createdAt: lastAt,
    });

    const summary = await service.getSummary('tenant_a');

    expect(summary.submitted30d).toBe(5);
    expect(summary.rejected30d).toBe(2);
    expect(summary.lastContributionAt).toBe(lastAt.toISOString());
    expect(summary.federatedOptIn).toBe(true);
  });
});
