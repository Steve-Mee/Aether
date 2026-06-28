import { listRecentHandoffs } from '../HandoffOverviewService';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    reflectionHandoffLog: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'h1',
          tenantId: 't1',
          sourceAgentKey: 'inventory',
          targetAgentKey: 'pricing',
          summary: JSON.stringify({
            mode: 'direct',
            intent: 'price_check',
            success: true,
            payloadSummary: 'Checked margins',
          }),
          parentRunId: 'run-1',
          createdAt: new Date('2026-06-01T10:00:00Z'),
        },
      ]),
    },
    agentPeerJob: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'j1',
          tenantId: 't1',
          sourceAgentKey: 'pricing',
          targetAgentKey: 'supplier',
          intent: 'quote',
          query: 'Get quote',
          status: 'completed',
          resultPayload: 'Done',
          parentRunId: null,
          createdAt: new Date('2026-06-01T09:00:00Z'),
          updatedAt: new Date('2026-06-01T09:05:00Z'),
          completedAt: new Date('2026-06-01T09:05:00Z'),
        },
      ]),
    },
  },
}));

describe('HandoffOverviewService', () => {
  it('merges reflection and peer jobs sorted by time desc', async () => {
    const items = await listRecentHandoffs('t1', 7, 15);
    expect(items).toHaveLength(2);
    expect(items[0]!.id).toBe('handoff-h1');
    expect(items[0]!.fromAgentKey).toBe('inventory');
    expect(items[1]!.mode).toBe('async');
  });
});
