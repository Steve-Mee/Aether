import type { SpecialistAgentDefinition, SpecialistExecuteRequest, SpecialistExecuteResult } from '../types';
import { AgentRegistry } from '../AgentRegistry';
import { AgentOrchestrator } from '../AgentSupervisorOrchestrator';
import type { SpecialistAgentRunner } from '../SpecialistAgentRunner';

describe('Goal-pursuit and proactive scenarios', () => {
  it('proactive opportunity: margin improvement via pricing+inventory', async () => {
    const mockRegistry = new AgentRegistry();
    mockRegistry.register({
      agentKey: 'pricing',
      displayName: 'Pricing Agent',
      supportedIntents: ['PRICING_OPTIMIZE'],
      rolePrompt: 'Optimizes pricing',
      allowedTools: [],
      memoryNamespace: 'pricing',
    });
    mockRegistry.register({
      agentKey: 'inventory',
      displayName: 'Inventory Agent',
      supportedIntents: ['INVENTORY_CHECK'],
      rolePrompt: 'Manages inventory',
      allowedTools: [],
      memoryNamespace: 'inventory',
    });

    const scenario: Array<{ agentKey: string; output: string; requiresApproval?: boolean }> = [
      {
        agentKey: 'pricing',
        output: 'Opportunity: 3 SKUs underpriced by 8% vs market. Recommended price increase.',
      },
      {
        agentKey: 'inventory',
        output: 'Inventory sufficient for 2 SKUs, third needs restock before price change.',
      },
    ];

    const mockRunner: Partial<SpecialistAgentRunner> = {
      runWithDefinition: jest.fn(
        async (def: SpecialistAgentDefinition): Promise<SpecialistExecuteResult> => {
          const step = scenario.find((s) => s.agentKey === def.agentKey);
          return {
            narrative: step?.output ?? '',
            pendingActions: step?.requiresApproval
              ? [
                  {
                    proposalId: `proposal_${def.agentKey}_1`,
                    tool: 'price_update',
                    summary: 'Update pricing',
                    risk: 'low' as const,
                    requiresApproval: true,
                    payload: {},
                  },
                ]
              : [],
          };
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
        agentKey: 'pricing',
        intent: 'PRICING_OPTIMIZE',
        command: 'Find margin opportunities',
        contextSnippets: [],
        handlerResult: '',
      },
      {
        tenantId: 't1',
        agentKey: 'inventory',
        intent: 'INVENTORY_CHECK',
        command: 'Check inventory for pricing changes',
        contextSnippets: [],
        handlerResult: '',
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].narrative).toContain('underpriced');
    expect(results[1].narrative).toContain('needs restock');
  });

  it('goal pursuit: autonomous restock suggestion flow', async () => {
    const mockRegistry = new AgentRegistry();
    mockRegistry.register({
      agentKey: 'inventory',
      displayName: 'Inventory Agent',
      supportedIntents: ['RESTOCK_SUGGEST'],
      rolePrompt: 'Suggests restocks',
      allowedTools: [],
      memoryNamespace: 'inventory',
    });

    const mockRunner: Partial<SpecialistAgentRunner> = {
      runWithDefinition: jest.fn(
        async (): Promise<SpecialistExecuteResult> => {
          return {
            narrative: 'Low stock detected on SKU-A (2 units remaining, avg daily sales 5)',
            pendingActions: [
              {
                proposalId: 'restock_1',
                tool: 'restock_suggest',
                summary: 'Restock SKU-A',
                risk: 'low',
                requiresApproval: true,
                payload: {
                  skuId: 'SKU-A',
                  suggestedQuantity: 50,
                  reason: 'Stock critically low',
                },
              },
            ],
          };
        }
      ),
    };

    const orchestrator = new AgentOrchestrator(
      mockRegistry,
      mockRunner as SpecialistAgentRunner
    );

    const result = await orchestrator.executeSpecialist({
      tenantId: 't1',
      agentKey: 'inventory',
      intent: 'RESTOCK_SUGGEST',
      command: 'Check for restock needs',
      contextSnippets: [],
      handlerResult: '',
    });

    expect(result.narrative).toContain('Low stock detected');
    expect(result.pendingActions).toHaveLength(1);
    expect(result.pendingActions?.[0].tool).toBe('restock_suggest');
    expect(result.pendingActions?.[0].requiresApproval).toBe(true);
    expect(result.pendingActions?.[0].payload.suggestedQuantity).toBe(50);
  });

  it('supervisor orchestrates multi-goal scenario with HITL gate', async () => {
    const mockRegistry = new AgentRegistry();
    mockRegistry.register({
      agentKey: 'supervisor',
      displayName: 'Supervisor Agent',
      supportedIntents: ['PLAN_GOAL'],
      rolePrompt: 'Plans goals',
      allowedTools: [],
      memoryNamespace: 'supervisor',
    });

    const mockRunner: Partial<SpecialistAgentRunner> = {
      runWithDefinition: jest.fn(
        async (): Promise<SpecialistExecuteResult> => {
          return {
            narrative: 'Goal: Improve margin. Plan: 1) pricing review (autonomous), 2) bulk discount campaign (requires HITL)',
            pendingActions: [
              {
                proposalId: 'hitl_gate_1',
                tool: 'request_hitl_approval',
                summary: 'Bulk discount campaign',
                risk: 'high',
                requiresApproval: true,
                payload: {
                  planSummary: 'Bulk discount campaign: 15% off across 20 SKUs',
                  reason: 'High impact action',
                },
              },
            ],
          };
        }
      ),
    };

    const orchestrator = new AgentOrchestrator(
      mockRegistry,
      mockRunner as SpecialistAgentRunner
    );

    const result = await orchestrator.executeSpecialist({
      tenantId: 't1',
      agentKey: 'supervisor',
      intent: 'PLAN_GOAL',
      command: 'Plan goal: Improve margin by 10%',
      contextSnippets: [],
      handlerResult: '',
    });

    expect(result.narrative).toContain('Improve margin');
    expect(result.pendingActions).toHaveLength(1);
    expect(result.pendingActions?.[0].tool).toBe('request_hitl_approval');
    expect(result.pendingActions?.[0].risk).toBe('high');
  });
});
