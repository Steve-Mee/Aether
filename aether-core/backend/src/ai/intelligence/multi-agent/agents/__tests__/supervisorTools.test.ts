import {
  planGoalSubtasksTool,
  requestHitlGateTool,
  synthesizeAgentResultsTool,
} from '../supervisorTools';

describe('supervisorTools', () => {
  it('planGoalSubtasks decomposes marketing+inventory goals', async () => {
    const tool = planGoalSubtasksTool();
    const result = (await tool.executeRead!(
      { tenantId: 't1' },
      { goal: 'Start een marketing campagne en check voorraad' }
    )) as Record<string, unknown> & { subtasks: Array<{ agentKey: string }> };
    expect(result.success).toBe(true);
    const agents = result.subtasks.map((s) => s.agentKey);
    expect(agents).toContain('promotion');
    expect(agents).toContain('inventory');
  });

  it('planGoalSubtasks flags HITL for high-impact constraints', async () => {
    const tool = planGoalSubtasksTool();
    const result = (await tool.executeRead!(
      { tenantId: 't1' },
      { goal: 'Verlaag alle prijzen autonoom', constraints: 'meer dan 15% korting' }
    )) as Record<string, unknown>;
    expect(result.requiresHitl).toBe(true);
  });

  it('synthesizeAgentResults builds coherent plan', async () => {
    const tool = synthesizeAgentResultsTool();
    const result = (await tool.executeRead!(
      { tenantId: 't1' },
      {
        goal: 'Marge verbeteren',
        results: [
          { agentKey: 'pricing', summary: '3 SKUs te duur' },
          { agentKey: 'inventory', summary: 'low stock op A' },
        ],
      }
    )) as Record<string, unknown>;
    expect(String(result.coherentPlan)).toContain('[pricing]');
    expect(String(result.coherentPlan)).toContain('Marge verbeteren');
  });

  it('requestHitlGate requires approval', async () => {
    const tool = requestHitlGateTool();
    const proposal = await tool.buildProposal!(
      { tenantId: 't1' },
      { planSummary: 'Bulk prijsdaling 20%', reason: 'High impact' }
    );
    expect(proposal.requiresApproval).toBe(true);
    expect(proposal.risk).toBe('high');
  });
});
