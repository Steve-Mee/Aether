import { GraphLangGraphExecutor } from '../GraphLangGraphExecutor';
import type { NativeGraphOrchestrator } from '../NativeGraphOrchestrator';
import type { GraphDefinition } from '../types';

describe('GraphLangGraphExecutor', () => {
  const definition: GraphDefinition = {
    entryNodeId: 'supplier',
    nodes: [
      { id: 'supplier', kind: 'agent', agentKey: 'supplier' },
      { id: 'pricing', kind: 'agent', agentKey: 'pricing' },
      { id: 'merge', kind: 'merge' },
    ],
    edges: [
      { from: 'supplier', to: 'pricing' },
      { from: 'pricing', to: 'merge' },
    ],
  };

  it('compiles graph with expected node count', () => {
    const native = {
      executeGraph: jest.fn().mockResolvedValue({ mode: 'sequential', mergedNarrative: 'ok' }),
      isEnabled: () => true,
    } as unknown as NativeGraphOrchestrator;
    const executor = new GraphLangGraphExecutor({ nativeOrchestrator: native });
    const compiled = executor.buildCompiledGraph(definition);
    expect(compiled).toBeDefined();
    expect(typeof compiled.invoke).toBe('function');
  });

  it('executes sequential graph via native node runner', async () => {
    const native = {
      executeGraph: jest.fn().mockResolvedValue({ mode: 'sequential', mergedNarrative: 'merged' }),
      isEnabled: () => true,
    } as unknown as NativeGraphOrchestrator;
    const executor = new GraphLangGraphExecutor({ nativeOrchestrator: native });
    const result = await executor.execute(
      {
        tenantId: 't1',
        command: 'review supplier pricing',
        actorId: 'a1',
        intent: 'PRICING_OPTIMIZE',
        agents: [
          { agentKey: 'supplier', intent: 'SUPPLIER_MONITOR' },
          { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
        ],
        graphDefinition: definition,
      },
      definition
    );
    expect(result.mergedNarrative).toBeTruthy();
  });
});
