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

  it('continues when one agent fails and emits branch results', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const mockRunner = {
      runWithDefinition: jest
        .fn()
        .mockResolvedValueOnce({ narrative: 'Mail done', agentRunId: 'm1' })
        .mockRejectedValueOnce(new Error('Inventory timeout')),
    } as unknown as SpecialistAgentRunner;

    const coordinator = new ParallelCoordinator(registry, mockRunner);
    const onEvent = jest.fn();
    const result = await coordinator.executeParallel({
      tenantId: 't1',
      command: 'mail and inventory',
      agents: [
        { agentKey: 'mail', intent: 'EMAIL_SUMMARY' },
        { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
      ],
      onEvent,
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]?.status).toBe('completed');
    expect(result.results[1]?.status).toBe('failed');
    expect(result.mergedNarrative).toContain('[inventory] Error:');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'agent_started', agentKey: 'mail' })
    );
  });

  it('skips agents beyond max parallel concurrency cap', async () => {
    process.env.MULTI_AGENT_MAX_PARALLEL_AGENTS = '2';
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const mockRunner = {
      runWithDefinition: jest.fn().mockResolvedValue({ narrative: 'Done', agentRunId: 'x1' }),
    } as unknown as SpecialistAgentRunner;

    const coordinator = new ParallelCoordinator(registry, mockRunner);
    const result = await coordinator.executeParallel({
      tenantId: 't1',
      command: 'multi agent',
      agents: [
        { agentKey: 'mail', intent: 'EMAIL_SUMMARY' },
        { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
        { agentKey: 'supplier', intent: 'SUPPLIER_MONITOR' },
      ],
    });

    expect(mockRunner.runWithDefinition).toHaveBeenCalledTimes(2);
    expect(result.results).toHaveLength(3);
    expect(result.results.filter((r) => r.status === 'skipped')).toHaveLength(1);
    delete process.env.MULTI_AGENT_MAX_PARALLEL_AGENTS;
  });
});
