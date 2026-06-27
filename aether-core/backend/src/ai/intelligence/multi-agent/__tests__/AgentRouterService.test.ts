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
});
