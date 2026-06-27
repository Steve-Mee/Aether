import { AgentRegistry } from '../AgentRegistry';
import { CollaborationPlannerService } from '../CollaborationPlannerService';
import { DEFAULT_SPECIALIST_AGENTS } from '../agents';

describe('CollaborationPlannerService', () => {
  const prevPlan = process.env.MULTI_AGENT_LLM_COLLABORATION_PLANNING;
  const prevDelegation = process.env.MULTI_AGENT_DELEGATION_ENABLED;
  const prevNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = 'true';
    process.env.NODE_ENV = 'test';
    delete process.env.MULTI_AGENT_LLM_COLLABORATION_PLANNING;
  });

  afterEach(() => {
    process.env.MULTI_AGENT_LLM_COLLABORATION_PLANNING = prevPlan;
    process.env.MULTI_AGENT_DELEGATION_ENABLED = prevDelegation;
    process.env.NODE_ENV = prevNodeEnv;
  });

  it('is enabled by default in non-production', () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const planner = new CollaborationPlannerService(registry);
    expect(planner.isEnabled()).toBe(true);
  });

  it('is disabled in production without explicit opt-in', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MULTI_AGENT_LLM_COLLABORATION_PLANNING;
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const planner = new CollaborationPlannerService(registry);
    expect(planner.isEnabled()).toBe(false);
  });

  it('returns null when explicitly disabled', async () => {
    process.env.MULTI_AGENT_LLM_COLLABORATION_PLANNING = 'false';
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const planner = new CollaborationPlannerService(registry);
    const result = await planner.plan({
      intent: 'UNKNOWN',
      command: 'help me with everything',
    });
    expect(result).toBeNull();
  });

  it('parses LLM multi-agent sequential plan', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const mockLlm = {
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          mode: 'sequential',
          agents: [
            { agentKey: 'inventory', intent: 'INVENTORY_STATUS', reason: 'stock first' },
            { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE', reason: 'then price' },
          ],
          confidence: 0.9,
          reason: 'inventory informs pricing',
        })
      ),
    };
    const planner = new CollaborationPlannerService(registry, mockLlm as never);
    const plan = await planner.plan({
      intent: 'UNKNOWN',
      command: 'optimize prices for low stock items',
    });
    expect(plan).not.toBeNull();
    expect(plan!.mode).toBe('sequential');
    expect(plan!.agents).toHaveLength(2);
    expect(plan!.source).toBe('llm');
  });

  it('overrides parallel when mutating intents present', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const mockLlm = {
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          mode: 'parallel',
          agents: [
            { agentKey: 'inventory', intent: 'RESTOCK_SUGGEST', reason: 'restock' },
            { agentKey: 'pricing', intent: 'LOW_MARGIN_REPORT', reason: 'margins' },
          ],
          confidence: 0.85,
          reason: 'both tasks',
        })
      ),
    };
    const planner = new CollaborationPlannerService(registry, mockLlm as never);
    const plan = await planner.plan({ intent: 'UNKNOWN', command: 'restock and report margins' });
    expect(plan!.mode).toBe('sequential');
  });

  it('toExecutionPlan maps parallel read-only agents', async () => {
    const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    const planner = new CollaborationPlannerService(registry);
    const execPlan = planner.toExecutionPlan(
      {
        mode: 'parallel',
        agents: [
          { agentKey: 'inventory', intent: 'INVENTORY_STATUS', reason: 'a' },
          { agentKey: 'mail', intent: 'EMAIL_SUMMARY', reason: 'b' },
        ],
        confidence: 0.9,
        source: 'llm',
        reason: 'parallel read',
      },
      'status overview'
    );
    expect(execPlan.mode).toBe('parallel');
    expect(execPlan.routingSource).toBe('llm-plan');
  });
});
