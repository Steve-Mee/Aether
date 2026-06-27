import { SecAggRoundService } from '../SecAggRoundService';
import { prisma } from '../../../../../shared/prisma/client';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    tenantSettings: { findUnique: jest.fn() },
    secAggRound: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    secAggParticipant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    secAggMaskedUpdate: {
      upsert: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    globalInsight: { upsert: jest.fn() },
  },
}));

describe('SecAggRoundService', () => {
  const service = new SecAggRoundService();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INTELLIGENCE_SECAGG_ENABLED = 'true';
    process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V2 = 'true';
    process.env.SECAGG_MIN_PARTICIPANTS = '2';
    process.env.FEDERATED_MIN_TENANTS = '2';
    process.env.FEDERATED_MIN_SAMPLES = '2';
  });

  afterEach(() => {
    delete process.env.INTELLIGENCE_SECAGG_ENABLED;
    delete process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V2;
    delete process.env.SECAGG_MIN_PARTICIPANTS;
    delete process.env.FEDERATED_MIN_TENANTS;
    delete process.env.FEDERATED_MIN_SAMPLES;
  });

  it('enqueues masked update for opted-in tenant', async () => {
    (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
      brainFederatedContributionEnabled: true,
    });
    (prisma.secAggRound.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.secAggRound.create as jest.Mock).mockResolvedValue({
      id: 'round1',
      category: 'pricing',
      metric: 'auto_apply_rate',
    });
    (prisma.secAggParticipant.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.secAggParticipant.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.secAggParticipant.create as jest.Mock).mockResolvedValue({});
    (prisma.secAggMaskedUpdate.create as jest.Mock).mockResolvedValue({});
    (prisma.secAggRound.update as jest.Mock).mockResolvedValue({});

    const ok = await service.enqueueMaskedUpdate({
      tenantId: 'tenant_a',
      category: 'pricing',
      metric: 'auto_apply_rate',
      value: 0.42,
    });

    expect(ok).toBe(true);
    expect(prisma.secAggMaskedUpdate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roundId: 'round1',
          tenantId: 'tenant_a',
        }),
      })
    );
  });

  it('finalizes round into GlobalInsight without storing raw values', async () => {
    (prisma.secAggRound.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'round1',
        category: 'pricing',
        metric: 'auto_apply_rate',
        noiseEpsilon: 1.0,
      },
    ]);
    (prisma.secAggMaskedUpdate.findMany as jest.Mock).mockResolvedValue([
      { maskedValue: 10.5, personalMask: 2 },
      { maskedValue: 8.3, personalMask: -1 },
    ]);
    (prisma.secAggRound.update as jest.Mock).mockResolvedValue({});
    (prisma.globalInsight.upsert as jest.Mock).mockResolvedValue({});

    const count = await service.finalizeReadyRounds();

    expect(count).toBe(1);
    expect(prisma.globalInsight.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category_metric: { category: 'pricing', metric: 'auto_apply_rate' } },
        create: expect.objectContaining({ sampleSize: 2, tenantCount: 2 }),
      })
    );
    expect(prisma.secAggRound.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) })
    );
  });

  it('skips enqueue when SecAgg disabled', async () => {
    process.env.INTELLIGENCE_SECAGG_ENABLED = 'false';
    const ok = await service.enqueueMaskedUpdate({
      tenantId: 'tenant_a',
      category: 'pricing',
      metric: 'auto_apply_rate',
      value: 1,
    });
    expect(ok).toBe(false);
    expect(prisma.tenantSettings.findUnique).not.toHaveBeenCalled();
  });
});
