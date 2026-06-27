import { NativeGraphOrchestrator } from '../NativeGraphOrchestrator';
import type { AgentRegistry } from '../../AgentRegistry';
import type { ParallelCoordinator } from '../../ParallelCoordinator';

describe('NativeGraphOrchestrator', () => {
  const pricingDef = {
    agentKey: 'pricing',
    displayName: 'Pricing',
    rolePrompt: 'test',
    supportedIntents: ['LOW_MARGIN_REPORT'],
    allowedTools: [],
    memoryNamespace: 'pricing',
  };
  const inventoryDef = {
    agentKey: 'inventory',
    displayName: 'Inventory',
    rolePrompt: 'test',
    supportedIntents: ['INVENTORY_STATUS'],
    allowedTools: [],
    memoryNamespace: 'inventory',
  };

  const registry = {
    resolveByIntent: jest.fn((intent: string) => {
      if (intent === 'LOW_MARGIN_REPORT') return pricingDef;
      if (intent === 'INVENTORY_STATUS') return inventoryDef;
      return null;
    }),
  } as unknown as AgentRegistry;

  const parallelCoordinator = {
    executeParallel: jest.fn().mockResolvedValue({
      results: [{ narrative: 'pricing done', agentRunId: 'r1', toolTrace: [], pendingActions: [] }],
      mergedNarrative: 'pricing done',
      mergedToolTrace: [],
      pendingActions: [],
      agentRunIds: ['r1'],
    }),
  } as unknown as ParallelCoordinator;

  it('executes parallel graph for read-only sub-goals', async () => {
    const orchestrator = new NativeGraphOrchestrator(registry, undefined, parallelCoordinator);
    const result = await orchestrator.executeGraph({
      tenantId: 't1',
      command: 'margin and inventory',
      intent: 'COMPOUND_WORKFLOW',
      subGoals: [
        { intent: 'LOW_MARGIN_REPORT', command: 'show margins' },
        { intent: 'INVENTORY_STATUS', command: 'show inventory' },
      ],
      agents: [],
    });

    expect(result.mode).toBe('parallel');
    expect(result.mergedNarrative).toContain('pricing done');
    expect(parallelCoordinator.executeParallel).toHaveBeenCalled();
  });
});
