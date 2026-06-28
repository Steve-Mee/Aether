import { SpecialistAgentRunner } from '../SpecialistAgentRunner';
import { AgentRegistry } from '../AgentRegistry';
import { pricingAgentDefinition } from '../agents/PricingAgent';
import type { BrainAgentLoop } from '../../command-brain/BrainAgentLoop';
import type { PersonalBrainRegistry } from '../../personal-brain/PersonalBrainRegistry';

describe('SpecialistAgentRunner', () => {
  it('runs agent loop with filtered tools and agentKey', async () => {
    const registry = new AgentRegistry([pricingAgentDefinition]);
    const mockLoop = {
      run: jest.fn().mockResolvedValue({
        narrative: 'Marge-analyse afgerond',
        agentRunId: 'specialist-run-1',
        toolTrace: [{ tool: 'analyzeMargins', input: {}, output: '{}', status: 'ok' }],
        summary: { narrative: 'done', goalReached: true, reflections: [] },
      }),
    } as unknown as BrainAgentLoop;

    const mockBrains = {
      get: jest.fn().mockReturnValue({
        recall: jest.fn().mockResolvedValue({ snippets: [], matches: [] }),
      }),
    } as unknown as PersonalBrainRegistry;

    const runner = new SpecialistAgentRunner(registry, mockBrains, mockLoop);
    const result = await runner.run({
      tenantId: 'tenant-1',
      agentKey: 'pricing',
      intent: 'LOW_MARGIN_REPORT',
      command: 'toon lage marges',
      contextSnippets: ['product A: €10'],
      handlerResult: 'report ready',
    });

    expect(mockLoop.run).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        agentKey: 'pricing',
        allowedTools: pricingAgentDefinition.allowedTools,
        rolePrompt: pricingAgentDefinition.rolePrompt,
        parsedIntent: 'LOW_MARGIN_REPORT',
      })
    );
    expect(result.narrative).toBe('Marge-analyse afgerond');
    expect(result.handoffPackage?.sourceAgentKey).toBe('pricing');
  });
});
