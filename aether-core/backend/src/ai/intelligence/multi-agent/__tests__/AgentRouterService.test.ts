import { AgentRouterService } from '../AgentRouterService';
import { AgentRegistry } from '../AgentRegistry';
import { DEFAULT_SPECIALIST_AGENTS } from '../agents';

describe('AgentRouterService', () => {
  const prevEnv = process.env.MULTI_AGENT_DELEGATION_ENABLED;

  beforeEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = prevEnv;
    delete process.env.MULTI_AGENT_LLM_ROUTING;
  });

  it('routes by intent first', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const router = new AgentRouterService(registry);
    const decision = await router.route({ intent: 'EMAIL_SUMMARY', command: 'mail overzicht' });
    expect(decision.source).toBe('intent');
    expect(decision.agentKey).toBe('mail');
  });

  it('routes by keyword when intent unknown', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const router = new AgentRouterService(registry);
    const decision = await router.route({ intent: 'UNKNOWN', command: 'check inventory stock levels' });
    expect(decision.source).toBe('keyword');
    expect(decision.agentKey).toBe('inventory');
  });

  it('uses LLM when enabled and no match', async () => {
    process.env.MULTI_AGENT_LLM_ROUTING = 'true';
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const mockLlm = {
      generate: jest.fn().mockResolvedValue('{"agentKey":"pricing","confidence":0.9,"reason":"pricing task"}'),
    };
    const router = new AgentRouterService(registry, mockLlm as never);
    const decision = await router.route({ intent: 'UNKNOWN', command: 'help me decide what to do next quarter' });
    expect(decision.source).toBe('llm');
    expect(decision.agentKey).toBe('pricing');
  });

  it('routePlan returns sequential plan for cross-domain command', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const router = new AgentRouterService(registry);
    const plan = await router.routePlan({
      intent: 'UNKNOWN',
      command: 'check leveranciersprijzen en stel prijsaanpassingen voor',
    });
    expect(plan.mode).toBe('sequential');
    expect(plan.agents.length).toBeGreaterThanOrEqual(2);
    expect(plan.agents[0].agentKey).toBe('supplier');
    expect(plan.agents[1].agentKey).toBe('pricing');
    expect(plan.routingReason).toContain('collaboration');
  });

  it('routePlan returns sequential plan for inventory-pricing cross-domain', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const router = new AgentRouterService(registry);
    const plan = await router.routePlan({
      intent: 'UNKNOWN',
      command: 'toon low-stock producten en stel prijsoptimalisatie voor',
    });
    expect(plan.mode).toBe('sequential');
    expect(plan.agents[0].agentKey).toBe('inventory');
    expect(plan.agents[1].agentKey).toBe('pricing');
  });

  it('routePlan returns sequential plan for customer-pricing cross-domain', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const router = new AgentRouterService(registry);
    const plan = await router.routePlan({
      intent: 'UNKNOWN',
      command: 'toon klant order trends en stel prijsoptimalisatie voor',
    });
    expect(plan.mode).toBe('sequential');
    expect(plan.agents[0].agentKey).toBe('customer');
    expect(plan.agents[1].agentKey).toBe('pricing');
  });

  it('routes customer intents by keyword', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const router = new AgentRouterService(registry);
    const decision = await router.route({ intent: 'UNKNOWN', command: 'analyseer klant segmentatie' });
    expect(decision.source).toBe('keyword');
    expect(decision.agentKey).toBe('customer');
  });

  it('routePlan returns sequential plan for forecast-pricing cross-domain', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const router = new AgentRouterService(registry);
    const plan = await router.routePlan({
      intent: 'UNKNOWN',
      command: 'voorspel demand en stel prijsoptimalisatie voor',
    });
    expect(plan.mode).toBe('sequential');
    expect(plan.agents[0].agentKey).toBe('forecast');
    expect(plan.agents[1].agentKey).toBe('pricing');
  });

  it('routes forecast intent by keyword', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const router = new AgentRouterService(registry);
    const decision = await router.route({ intent: 'UNKNOWN', command: 'demand forecast voor volgende maand' });
    expect(decision.agentKey).toBe('forecast');
  });

  it('routePlan returns parallel plan for read-only multi-keyword command', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const router = new AgentRouterService(registry);
    const plan = await router.routePlan({
      intent: 'UNKNOWN',
      command: 'geef inventory status en email samenvatting',
    });
    expect(plan.mode).toBe('parallel');
    expect(plan.agents.length).toBe(2);
    expect(plan.agents.map((a) => a.agentKey).sort()).toEqual(['inventory', 'mail']);
  });

  it('routePlan returns multi-domain plan even when intent matches single agent', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const router = new AgentRouterService(registry);
    const plan = await router.routePlan({
      intent: 'EMAIL_SUMMARY',
      command: 'geef inventory status en email samenvatting',
    });
    expect(plan.agents.length).toBe(2);
    expect(plan.mode).toBe('parallel');
    expect(plan.agents.map((a) => a.agentKey).sort()).toEqual(['inventory', 'mail']);
  });

  it('routePlan uses LLM multi-select when enabled', async () => {
    process.env.MULTI_AGENT_LLM_ROUTING = 'true';
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const mockLlm = {
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          mode: 'parallel',
          agents: [
            { agentKey: 'supplier', intent: 'SUPPLIER_PRICE_INTEL' },
            { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
          ],
          confidence: 0.9,
          reason: 'read-only dual task',
        })
      ),
    };
    const router = new AgentRouterService(registry, mockLlm as never);
    const plan = await router.routePlan({
      intent: 'UNKNOWN',
      command: 'inventory stock and supplier leverancier overview',
    });
    expect(plan.mode).toBe('parallel');
    expect(plan.agents.length).toBe(2);
    expect(plan.routingSource).toBe('llm');
  });

  it('adaptive routing reorders sequential agents by performance', async () => {
    process.env.MULTI_AGENT_ADAPTIVE_ROUTING = 'true';
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const mockPerformance = {
      getTenantAgentScores: jest.fn().mockResolvedValue([
        { agentKey: 'supplier', successRate: 0.95, recentFailures: 0, sampleSize: 10 },
        { agentKey: 'pricing', successRate: 0.4, recentFailures: 3, sampleSize: 10 },
      ]),
      getPairSuccessRate: jest.fn().mockResolvedValue(null),
    };
    const router = new AgentRouterService(registry, undefined, undefined, undefined, mockPerformance);
    const plan = await router.routePlan({
      tenantId: 'tenant-1',
      intent: 'UNKNOWN',
      command: 'check leveranciersprijzen en stel prijsaanpassingen voor',
    });
    expect(plan.agents[0]?.agentKey).toBe('supplier');
    expect(plan.performanceScores?.supplier).toBeGreaterThan(plan.performanceScores?.pricing ?? 0);
    delete process.env.MULTI_AGENT_ADAPTIVE_ROUTING;
  });
});
