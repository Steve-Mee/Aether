import { AgentOrchestrator } from '../AgentSupervisorOrchestrator';
import { AgentRegistry } from '../AgentRegistry';
import { pricingAgentDefinition } from '../agents/PricingAgent';
import type { SpecialistAgentRunner } from '../SpecialistAgentRunner';

describe('AgentOrchestrator', () => {
  const prevEnv = process.env.MULTI_AGENT_DELEGATION_ENABLED;

  beforeEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = prevEnv;
  });

  it('routes pricing intents via registry', async () => {
    const registry = new AgentRegistry([pricingAgentDefinition]);
    const orchestrator = new AgentOrchestrator(registry);
    expect((await orchestrator.route('PRICE_UPDATE'))?.agentKey).toBe('pricing');
    expect(orchestrator.resolveTargetAgent('LOW_MARGIN_REPORT')).toBe('pricing');
  });

  it('detects supplier intel need from command keywords', () => {
    const registry = new AgentRegistry([pricingAgentDefinition]);
    const orchestrator = new AgentOrchestrator(registry);
    expect(orchestrator.needsSupplierIntel('verhoog prijs op basis van leverancier', 'PRICE_UPDATE')).toBe(true);
    expect(orchestrator.needsSupplierIntel('verhoog prijzen 5%', 'PRICE_UPDATE')).toBe(false);
  });

  it('executeSpecialist delegates to runner', async () => {
    const registry = new AgentRegistry([pricingAgentDefinition]);
    const mockRunner = {
      runWithDefinition: jest.fn().mockResolvedValue({
        narrative: 'Pricing analysis complete',
        agentRunId: 'run-1',
        handoffPackage: { sourceAgentKey: 'pricing', targetAgentKey: 'admin', reflectionIds: [], summary: 'done' },
      }),
    } as unknown as SpecialistAgentRunner;

    const orchestrator = new AgentOrchestrator(registry, mockRunner);
    const result = await orchestrator.executeSpecialist({
      tenantId: 't1',
      agentKey: 'pricing',
      intent: 'PRICE_UPDATE',
      command: 'verhoog prijzen',
      contextSnippets: [],
      handlerResult: 'ready',
    });

    expect(mockRunner.runWithDefinition).toHaveBeenCalled();
    expect(result.narrative).toBe('Pricing analysis complete');
  });
});
