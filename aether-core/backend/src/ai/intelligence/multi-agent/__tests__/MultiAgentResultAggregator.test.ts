import { MultiAgentResultAggregator } from '../MultiAgentResultAggregator';
import type { AgentBranchResult } from '../types';

describe('MultiAgentResultAggregator', () => {
  it('builds structured narrative for multiple agents', async () => {
    const aggregator = new MultiAgentResultAggregator();
    const results: AgentBranchResult[] = [
      {
        agentKey: 'mail',
        status: 'completed',
        narrative: 'Mail summary ready',
      },
      {
        agentKey: 'inventory',
        status: 'completed',
        narrative: 'Stock levels OK',
      },
    ];

    const aggregated = await aggregator.aggregate({
      command: 'mail and inventory status',
      results,
      agentKeys: ['mail', 'inventory'],
    });

    expect(aggregated.synthesisSource).toBe('structured');
    expect(aggregated.narrative).toContain('mail');
    expect(aggregated.narrative).toContain('inventory');
    expect(aggregated.perAgentContributions).toHaveLength(2);
  });

  it('marks failed branches in contributions', async () => {
    const aggregator = new MultiAgentResultAggregator();
    const results: AgentBranchResult[] = [
      { agentKey: 'mail', status: 'completed', narrative: 'Done' },
      { agentKey: 'inventory', status: 'failed', narrative: '', error: 'timeout' },
    ];

    const aggregated = await aggregator.aggregate({
      command: 'check mail and inventory',
      results,
      agentKeys: ['mail', 'inventory'],
    });

    expect(aggregated.perAgentContributions[1]?.status).toBe('failed');
    expect(aggregated.perAgentContributions[1]?.summary).toContain('timeout');
  });

  it('detects conflicting pending actions on same entity', async () => {
    const aggregator = new MultiAgentResultAggregator();
    const results: AgentBranchResult[] = [
      {
        agentKey: 'pricing',
        status: 'completed',
        narrative: 'Raise price',
        pendingActions: [
          {
            proposalId: 'p1',
            tool: 'updatePrice',
            summary: 'Raise 5%',
            risk: 'medium',
            requiresApproval: true,
            payload: { productId: 'sku-1', percentage: 5 },
          },
        ],
      },
      {
        agentKey: 'supplier',
        status: 'completed',
        narrative: 'Lower cost',
        pendingActions: [
          {
            proposalId: 'p2',
            tool: 'updatePrice',
            summary: 'Lower 3%',
            risk: 'medium',
            requiresApproval: true,
            payload: { productId: 'sku-1', percentage: -3 },
          },
        ],
      },
    ];

    const aggregated = await aggregator.aggregate({
      command: 'optimize sku-1',
      results,
      agentKeys: ['pricing', 'supplier'],
    });

    expect(aggregated.conflicts).toBeDefined();
    expect(aggregated.conflicts!.length).toBeGreaterThan(0);
  });

  it('uses LLM synthesis when enabled', async () => {
    process.env.MULTI_AGENT_RESULT_SYNTHESIS = 'true';
    const mockLlm = {
      generate: jest.fn().mockResolvedValue('Unified action plan from LLM'),
    };
    const aggregator = new MultiAgentResultAggregator(mockLlm as never);

    const aggregated = await aggregator.aggregate({
      command: 'mail and inventory',
      results: [
        { agentKey: 'mail', status: 'completed', narrative: 'Mail done' },
        { agentKey: 'inventory', status: 'completed', narrative: 'Stock ok' },
      ],
      agentKeys: ['mail', 'inventory'],
    });

    expect(aggregated.synthesisSource).toBe('llm');
    expect(aggregated.narrative).toContain('Unified action plan');
    delete process.env.MULTI_AGENT_RESULT_SYNTHESIS;
  });
});
