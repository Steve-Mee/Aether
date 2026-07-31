import { HandoffOverviewService } from '../HandoffOverviewService';
import type { HandoffOverviewPort } from '../../ports/HandoffOverviewPort';

describe('HandoffOverviewService', () => {
  const handoffPort: jest.Mocked<HandoffOverviewPort> = {
    findReflectionHandoffs: jest.fn().mockResolvedValue([
      {
        id: 'h1',
        summary: JSON.stringify({
          mode: 'direct',
          intent: 'price_check',
          success: true,
          payloadSummary: 'Checked margins',
        }),
        createdAt: new Date('2026-06-01T10:00:00Z'),
        fromAgentKey: 'inventory',
        toAgentKey: 'pricing',
        parentRunId: 'run-1',
      },
    ]),
    findPeerJobs: jest.fn().mockResolvedValue([
      {
        id: 'j1',
        fromAgentKey: 'pricing',
        toAgentKey: 'supplier',
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
  };

  it('merges reflection and peer jobs sorted by time desc', async () => {
    const service = new HandoffOverviewService(handoffPort);
    const items = await service.listRecentHandoffs('t1', 7, 15);
    expect(items).toHaveLength(2);
    expect(items[0]!.id).toBe('handoff-h1');
    expect(items[0]!.fromAgentKey).toBe('inventory');
    expect(items[1]!.mode).toBe('async');
  });
});
