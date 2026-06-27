import { AgentRegistry } from '../AgentRegistry';
import { AgentRouterService } from '../AgentRouterService';
import { CollaborationPlannerService } from '../CollaborationPlannerService';
import { DEFAULT_SPECIALIST_AGENTS } from '../agents';

describe('AgentRouterService LLM collaboration plan', () => {
  const prevEnv = process.env.MULTI_AGENT_DELEGATION_ENABLED;
  const prevPlan = process.env.MULTI_AGENT_LLM_COLLABORATION_PLANNING;
  const prevNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = 'true';
    process.env.NODE_ENV = 'test';
    delete process.env.MULTI_AGENT_LLM_COLLABORATION_PLANNING;
  });

  afterEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = prevEnv;
    process.env.MULTI_AGENT_LLM_COLLABORATION_PLANNING = prevPlan;
    process.env.NODE_ENV = prevNodeEnv;
  });

  it('uses LLM collaboration plan when rules do not match', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const mockLlm = {
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          mode: 'parallel',
          agents: [
            { agentKey: 'inventory', intent: 'INVENTORY_STATUS', reason: 'stock' },
            { agentKey: 'mail', intent: 'EMAIL_SUMMARY', reason: 'mail' },
          ],
          confidence: 0.88,
          reason: 'overview',
        })
      ),
    };
    const planner = new CollaborationPlannerService(registry, mockLlm as never);
    const router = new AgentRouterService(registry, mockLlm as never, planner);
    const plan = await router.routePlan({
      intent: 'UNKNOWN',
      command: 'give me a general business overview',
    });
    expect(plan.mode).toBe('parallel');
    expect(plan.routingSource).toBe('llm-plan');
    expect(plan.agents.map((a) => a.agentKey).sort()).toEqual(['inventory', 'mail']);
  });
});
