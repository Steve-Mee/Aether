import { AgentOrchestrator } from '../AgentSupervisorOrchestrator';
import { AgentRegistry } from '../AgentRegistry';
import type { SpecialistAgentRunner } from '../SpecialistAgentRunner';
import type { SpecialistExecuteRequest, SpecialistExecuteResult } from '../types';

describe('Multi-agent collaboration handoffs', () => {
  it('returns→supplier handoff: quality issue delegation', async () => {
    const mockRegistry = new AgentRegistry();
    mockRegistry.register({
      agentKey: 'returns',
      displayName: 'Returns Agent',
      supportedIntents: ['RETURNS_ANALYSIS'],
      rolePrompt: 'Analyzes return patterns',
      allowedTools: [],
      memoryNamespace: 'returns',
    });
    mockRegistry.register({
      agentKey: 'supplier',
      displayName: 'Supplier Agent',
      supportedIntents: ['SUPPLIER_MONITOR'],
      rolePrompt: 'Supplier intelligence',
      allowedTools: [],
      memoryNamespace: 'supplier',
    });

    let executionOrder: string[] = [];
    const mockRunner: Partial<SpecialistAgentRunner> = {
      runWithDefinition: jest.fn(
        async (def, req: SpecialistExecuteRequest): Promise<SpecialistExecuteResult> => {
          executionOrder.push(def.agentKey);
          if (def.agentKey === 'returns') {
            return {
              narrative: 'High return rate detected: 18% from supplier S1',
              handoffPackage: {
                delegationId: 'del1',
                sourceAgentKey: 'returns',
                targetAgentKey: 'supplier',
                summary: 'Investigate supplier S1 quality',
                reflectionIds: [],
              },
            };
          }
          if (def.agentKey === 'supplier') {
            return {
              narrative: 'Supplier S1: quality score declining, recommend review',
            };
          }
          return { narrative: '' };
        }
      ),
    };

    const orchestrator = new AgentOrchestrator(
      mockRegistry,
      mockRunner as SpecialistAgentRunner
    );

    const result = await orchestrator.chainHandoff({
      tenantId: 't1',
      fromAgentKey: 'returns',
      toAgentKey: 'supplier',
      intent: 'SUPPLIER_MONITOR',
      command: 'Check supplier quality',
      context: [],
      actorId: 'actor1',
    });

    expect(executionOrder).toEqual(['supplier']);
    expect(result.narrative).toContain('quality score declining');
  });

  it('sequential chain degrades gracefully on partial failure', async () => {
    const mockRegistry = new AgentRegistry();
    mockRegistry.register({
      agentKey: 'returns',
      displayName: 'Returns Agent',
      supportedIntents: ['RETURNS_ANALYSIS'],
      rolePrompt: 'Analyzes returns',
      allowedTools: [],
      memoryNamespace: 'returns',
    });
    mockRegistry.register({
      agentKey: 'supplier',
      displayName: 'Supplier Agent',
      supportedIntents: ['SUPPLIER_MONITOR'],
      rolePrompt: 'Supplier intel',
      allowedTools: [],
      memoryNamespace: 'supplier',
    });
    mockRegistry.register({
      agentKey: 'pricing',
      displayName: 'Pricing Agent',
      supportedIntents: ['PRICING'],
      rolePrompt: 'Pricing',
      allowedTools: [],
      memoryNamespace: 'pricing',
    });

    const mockRunner: Partial<SpecialistAgentRunner> = {
      runWithDefinition: jest.fn(
        async (def): Promise<SpecialistExecuteResult> => {
          if (def.agentKey === 'returns') {
            return { narrative: 'Returns analyzed' };
          }
          if (def.agentKey === 'supplier') {
            return { narrative: '', error: 'Supplier API timeout' };
          }
          if (def.agentKey === 'pricing') {
            return { narrative: 'Pricing recommendations generated' };
          }
          return { narrative: '' };
        }
      ),
    };

    const orchestrator = new AgentOrchestrator(
      mockRegistry,
      mockRunner as SpecialistAgentRunner
    );

    const results = await orchestrator.executeSequential([
      {
        tenantId: 't1',
        agentKey: 'returns',
        intent: 'RETURNS_ANALYSIS',
        command: 'Analyze returns',
        contextSnippets: [],
        handlerResult: '',
      },
      {
        tenantId: 't1',
        agentKey: 'supplier',
        intent: 'SUPPLIER_MONITOR',
        command: 'Get supplier intel',
        contextSnippets: [],
        handlerResult: '',
      },
      {
        tenantId: 't1',
        agentKey: 'pricing',
        intent: 'PRICING',
        command: 'Get pricing',
        contextSnippets: [],
        handlerResult: '',
      },
    ]);

    expect(results).toHaveLength(3);
    expect(results[0].narrative).toBe('Returns analyzed');
    expect(results[1].error).toBe('Supplier API timeout');
    expect(results[2].narrative).toBe('Pricing recommendations generated');
  });

  it('parallel execution collects partial results on mixed success/failure', async () => {
    const mockRegistry = new AgentRegistry();
    mockRegistry.register({
      agentKey: 'inventory',
      displayName: 'Inventory Agent',
      supportedIntents: ['INVENTORY'],
      rolePrompt: 'Inventory',
      allowedTools: [],
      memoryNamespace: 'inventory',
    });
    mockRegistry.register({
      agentKey: 'forecast',
      displayName: 'Forecast Agent',
      supportedIntents: ['FORECAST'],
      rolePrompt: 'Forecast',
      allowedTools: [],
      memoryNamespace: 'forecast',
    });

    const mockRunner: Partial<SpecialistAgentRunner> = {
      runWithDefinition: jest.fn(
        async (def): Promise<SpecialistExecuteResult> => {
          if (def.agentKey === 'inventory') {
            return { narrative: 'Inventory: 5 low-stock items' };
          }
          if (def.agentKey === 'forecast') {
            throw new Error('Forecast service unavailable');
          }
          return { narrative: '' };
        }
      ),
    };

    const { ParallelCoordinator } = await import('../ParallelCoordinator');
    const parallelCoordinator = new ParallelCoordinator(
      mockRegistry,
      mockRunner as SpecialistAgentRunner
    );

    const orchestrator = new AgentOrchestrator(
      mockRegistry,
      mockRunner as SpecialistAgentRunner,
      undefined,
      undefined,
      parallelCoordinator
    );

    const result = await orchestrator.executeParallel({
      tenantId: 't1',
      command: 'Check inventory and forecast',
      agents: [
        { agentKey: 'inventory', intent: 'INVENTORY' },
        { agentKey: 'forecast', intent: 'FORECAST' },
      ],
      collectiveSnippets: [],
    });

    expect(result.results).toHaveLength(2);
    const inventoryResult = result.results.find((r) => r.agentKey === 'inventory');
    const forecastResult = result.results.find((r) => r.agentKey === 'forecast');

    expect(inventoryResult?.status).toBe('completed');
    expect(inventoryResult?.narrative).toContain('low-stock');
    expect(forecastResult?.status).toBe('failed');
    expect(forecastResult?.error).toContain('unavailable');
  });
});
