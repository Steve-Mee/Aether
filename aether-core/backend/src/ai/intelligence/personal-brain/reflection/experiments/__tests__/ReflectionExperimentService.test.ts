import { ReflectionExperimentService, tenantBucket } from '../ReflectionExperimentService';

jest.mock('../../../../../../shared/prisma/client', () => ({
  prisma: {
    reflectionExperiment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    reflectionExperimentOutcome: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

import { prisma } from '../../../../../../shared/prisma/client';

const prismaMock = prisma as unknown as {
  reflectionExperiment: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
  reflectionExperimentOutcome: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
};

describe('ReflectionExperimentService', () => {
  const service = new ReflectionExperimentService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assigns deterministic tenant bucket', () => {
    expect(tenantBucket('tenant-a')).toBe(tenantBucket('tenant-a'));
    expect(tenantBucket('tenant-a')).not.toBe(tenantBucket('tenant-b'));
  });

  it('returns control config when no experiment running', async () => {
    (prismaMock.reflectionExperiment.findFirst as jest.Mock).mockResolvedValue(null);
    const resolved = await service.resolveConfig('tenant-1');
    expect(resolved.variantArm).toBe('control');
    expect(resolved.experimentId).toBeNull();
  });

  it('returns treatment config for in-bucket tenant', async () => {
    (prismaMock.reflectionExperiment.findFirst as jest.Mock).mockResolvedValue({
      id: 'exp-1',
      bucketMin: 0,
      bucketMax: 99,
      variantConfig: { failureTrigger: false, adaptiveHints: true },
    });
    const resolved = await service.resolveConfig('tenant-1');
    expect(resolved.variantArm).toBe('treatment');
    expect(resolved.config.failureTrigger).toBe(false);
  });

  it('records outcome idempotently per runId and metric', async () => {
    (prismaMock.reflectionExperiment.findFirst as jest.Mock).mockResolvedValue({ id: 'exp-1' });
    (prismaMock.reflectionExperimentOutcome.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

    await service.recordOutcome({
      tenantId: 't1',
      metric: 'reflection_goal_reached_rate',
      value: 1,
      runId: 'run-1',
    });

    expect(prismaMock.reflectionExperimentOutcome.create).not.toHaveBeenCalled();
  });
});
