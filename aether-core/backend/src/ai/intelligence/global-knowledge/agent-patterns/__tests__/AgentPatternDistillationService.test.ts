import { AgentPatternDistillationService } from '../AgentPatternDistillationService';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    brainAgentRun: {
      findMany: jest.fn().mockResolvedValue([
        { agentKey: 'pricing', status: 'completed', delegationMeta: null },
        { agentKey: 'pricing', status: 'completed', delegationMeta: null },
        { agentKey: 'pricing', status: 'failed', delegationMeta: null },
      ]),
    },
    globalAgentPattern: {
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

describe('AgentPatternDistillationService', () => {
  it('distills success rates without raw command text', async () => {
    const service = new AgentPatternDistillationService();
    const patterns = await service.distillFromCompletedRuns('tenant_a');
    expect(patterns.length).toBe(1);
    expect(patterns[0].patternType).toBe('run_success_rate');
    expect(patterns[0].payload).not.toHaveProperty('command');
  });
});
