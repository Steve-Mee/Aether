import { ParallelCoordinator } from '../ParallelCoordinator';
import { AgentRegistry } from '../AgentRegistry';
import { DEFAULT_SPECIALIST_AGENTS } from '../agents';
import type { SpecialistAgentRunner } from '../SpecialistAgentRunner';

describe('ParallelCoordinator', () => {
  it('executes agents in parallel and merges results', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const mockRunner = {
      runWithDefinition: jest
        .fn()
        .mockResolvedValueOnce({ narrative: 'Mail done', agentRunId: 'm1', toolTrace: [{ tool: 'getEmailSummary', input: {}, output: '{}', status: 'ok' }] })
        .mockResolvedValueOnce({ narrative: 'Inventory done', agentRunId: 'i1', toolTrace: [] }),
    } as unknown as SpecialistAgentRunner;

    const coordinator = new ParallelCoordinator(registry, mockRunner);
    const result = await coordinator.executeParallel({
      tenantId: 't1',
      command: 'mail and inventory',
      agents: [
        { agentKey: 'mail', intent: 'EMAIL_SUMMARY' },
        { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
      ],
    });

    expect(mockRunner.runWithDefinition).toHaveBeenCalledTimes(2);
    expect(result.mergedNarrative).toContain('[mail]');
    expect(result.mergedNarrative).toContain('[inventory]');
    expect(result.mergedToolTrace).toHaveLength(1);
    expect(result.agentRunIds).toEqual(['m1', 'i1']);
  });
});
