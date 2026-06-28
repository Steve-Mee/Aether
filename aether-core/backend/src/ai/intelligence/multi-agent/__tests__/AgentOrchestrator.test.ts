import { AgentOrchestrator } from '../AgentSupervisorOrchestrator';
import { AgentRegistry } from '../AgentRegistry';
import { pricingAgentDefinition } from '../agents/PricingAgent';
import { supplierAgentDefinition } from '../agents/SupplierAgent';
import { customerInsightsAgentDefinition } from '../agents/CustomerInsightsAgent';
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

  it('chains supplier intel before pricing when command mentions supplier', async () => {
    const registry = new AgentRegistry([pricingAgentDefinition, supplierAgentDefinition]);
    const mockRunner = {
      runWithDefinition: jest.fn().mockImplementation((_def, req) =>
        Promise.resolve({
          narrative: req.agentKey === 'supplier' ? 'Supplier intel ready' : 'Pricing done',
          agentRunId: `run-${req.agentKey}`,
        })
      ),
    } as unknown as SpecialistAgentRunner;

    const events: Array<{ type: string; agentKey?: string }> = [];
    const orchestrator = new AgentOrchestrator(registry, mockRunner);
    const result = await orchestrator.executeSpecialist({
      tenantId: 't1',
      agentKey: 'pricing',
      intent: 'PRICE_UPDATE',
      command: 'verhoog prijs op basis van inkoopprijs leverancier',
      contextSnippets: [],
      handlerResult: 'ready',
      onEvent: (e) => events.push(e),
    });

    expect(mockRunner.runWithDefinition).toHaveBeenCalledTimes(2);
    expect(result.narrative).toBe('Pricing done');
    expect(events.some((e) => e.type === 'agent_assigned' && e.agentKey === 'supplier')).toBe(true);
  });

  it('continues primary agent when chain step fails', async () => {
    const registry = new AgentRegistry([pricingAgentDefinition, supplierAgentDefinition]);
    const mockRunner = {
      runWithDefinition: jest.fn().mockImplementation((_def, req) => {
        if (req.agentKey === 'supplier') {
          return Promise.resolve({ narrative: '', error: 'Supplier unavailable' });
        }
        return Promise.resolve({ narrative: 'Pricing continued', agentRunId: 'run-pricing' });
      }),
    } as unknown as SpecialistAgentRunner;

    const orchestrator = new AgentOrchestrator(registry, mockRunner);
    const result = await orchestrator.executeSpecialist({
      tenantId: 't1',
      agentKey: 'pricing',
      intent: 'PRICE_UPDATE',
      command: 'verhoog prijs op basis van leverancier',
      contextSnippets: [],
      handlerResult: 'ready',
    });

    expect(result.narrative).toBe('Pricing continued');
    expect(mockRunner.runWithDefinition).toHaveBeenCalledTimes(2);
  });

  it('executeSequential emits agent_started and agent_completed per step', async () => {
    const registry = new AgentRegistry([customerInsightsAgentDefinition, pricingAgentDefinition]);
    const mockRunner = {
      runWithDefinition: jest.fn().mockImplementation((_def, req) =>
        Promise.resolve({
          narrative: `${req.agentKey} done`,
          agentRunId: `run-${req.agentKey}`,
        })
      ),
    } as unknown as SpecialistAgentRunner;

    const events: Array<{ type: string; agentKey?: string; executionMode?: string }> = [];
    const orchestrator = new AgentOrchestrator(registry, mockRunner);
    await orchestrator.executeSequential([
      {
        tenantId: 't1',
        agentKey: 'customer',
        intent: 'CUSTOMER_ORDER_TRENDS',
        command: 'klant trends',
        contextSnippets: [],
        handlerResult: 'ready',
        onEvent: (e) => events.push(e),
      },
      {
        tenantId: 't1',
        agentKey: 'pricing',
        intent: 'PRICING_OPTIMIZE',
        command: 'prijsoptimalisatie',
        contextSnippets: [],
        handlerResult: 'ready',
        onEvent: (e) => events.push(e),
      },
    ]);

    expect(events.filter((e) => e.type === 'agent_started' && e.executionMode === 'sequential')).toHaveLength(2);
    expect(events.filter((e) => e.type === 'agent_completed' && e.executionMode === 'sequential')).toHaveLength(2);
    expect(mockRunner.runWithDefinition).toHaveBeenCalledTimes(2);
  });

  it('executeSequential continues after failed step with error context', async () => {
    const registry = new AgentRegistry([customerInsightsAgentDefinition, pricingAgentDefinition]);
    const mockRunner = {
      runWithDefinition: jest.fn().mockImplementation((_def, req) => {
        if (req.agentKey === 'customer') {
          return Promise.resolve({ narrative: '', error: 'Customer data unavailable' });
        }
        return Promise.resolve({ narrative: 'Pricing continued', agentRunId: 'run-pricing' });
      }),
    } as unknown as SpecialistAgentRunner;

    const events: Array<{ type: string; agentKey?: string; error?: string }> = [];
    const orchestrator = new AgentOrchestrator(registry, mockRunner);
    const results = await orchestrator.executeSequential([
      {
        tenantId: 't1',
        agentKey: 'customer',
        intent: 'CUSTOMER_ORDER_TRENDS',
        command: 'klant trends',
        contextSnippets: [],
        handlerResult: 'ready',
        onEvent: (e) => events.push(e),
      },
      {
        tenantId: 't1',
        agentKey: 'pricing',
        intent: 'PRICING_OPTIMIZE',
        command: 'prijsoptimalisatie',
        contextSnippets: [],
        handlerResult: 'ready',
        onEvent: (e) => events.push(e),
      },
    ]);

    expect(results[1]?.narrative).toBe('Pricing continued');
    expect(events.some((e) => e.type === 'agent_completed' && e.agentKey === 'customer' && e.error)).toBe(true);
    const pricingCall = (mockRunner.runWithDefinition as jest.Mock).mock.calls.find(
      (c) => c[1].agentKey === 'pricing'
    );
    expect(pricingCall?.[1].chainContext).toEqual(
      expect.arrayContaining([expect.stringContaining('[customer error]')])
    );
  });
});
