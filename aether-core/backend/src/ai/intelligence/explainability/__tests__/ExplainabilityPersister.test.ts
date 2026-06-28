import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ExplainabilityPersister } from '../ExplainabilityPersister';

const upsertMock = jest.fn<(...args: unknown[]) => Promise<{ id: string }>>();
const findUniqueMock = jest.fn();
const findManyMock = jest.fn();
const updateMock = jest.fn();

jest.mock('../../../../shared/prisma/client', () => ({
  prisma: {
    agentExplainabilitySnapshot: {
      upsert: (...args: unknown[]) => upsertMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      findMany: (...args: unknown[]) => findManyMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('../../../../shared/logging/logger', () => ({
  logger: { warn: jest.fn() },
}));

jest.mock('../jobs/ExplainabilityPatternDistillJob', () => ({
  explainabilityPatternDistillJob: {
    distillSnapshot: jest.fn(() => Promise.resolve()),
  },
}));

describe('ExplainabilityPersister', () => {
  const persister = new ExplainabilityPersister();

  beforeEach(() => {
    jest.clearAllMocks();
    upsertMock.mockResolvedValue({ id: 'snap_1' });
  });

  it('upserts with v2 denormalized fields', async () => {
    const id = await persister.save({
      tenantId: 't1',
      sourceType: 'command',
      sourceId: 'cmd_1',
      persistLevel: 'extended',
      agentKeys: ['inventory', 'pricing'],
      triggerId: 'low_stock',
      intentId: 'RESTOCK',
      payload: {
        summary: 'Test',
        agents: [],
        dataSources: [],
        reasoningSteps: [],
        reflections: [],
      },
    });

    expect(id).toBe('snap_1');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          agentKeys: ['inventory', 'pricing'],
          triggerId: 'low_stock',
          intentId: 'RESTOCK',
          summarySource: 'template',
        }),
      })
    );
  });
});
