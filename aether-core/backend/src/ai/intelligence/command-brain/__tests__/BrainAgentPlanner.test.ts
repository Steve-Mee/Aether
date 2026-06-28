import { BrainAgentPlanner } from '../BrainAgentPlanner';
import { PersonalBrainToolRegistry } from '../../personal-brain/tools/PersonalBrainToolRegistry';
import { createInMemoryIntelligenceLayer } from '../../createIntelligenceLayer';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { MAX_PLAN_STEPS, normalizeAgentPlan, singleStepPlan } from '../types/AgentPlan';

describe('AgentPlan helpers', () => {
  it('normalizes valid plan with max 5 steps', () => {
    const raw = {
      goal: 'Optimaliseer prijzen',
      reasoning: 'Data eerst ophalen',
      steps: Array.from({ length: 7 }, (_, i) => ({ label: `Stap ${i + 1}` })),
    };
    const plan = normalizeAgentPlan(raw, 'fallback');
    expect(plan.steps).toHaveLength(MAX_PLAN_STEPS);
    expect(plan.goal).toBe('Optimaliseer prijzen');
  });

  it('falls back to single step on invalid input', () => {
    const plan = normalizeAgentPlan(null, 'Do something');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].label).toBe('Do something');
  });

  it('singleStepPlan uses goal as label', () => {
    const plan = singleStepPlan('Haal producten op');
    expect(plan.steps[0].label).toBe('Haal producten op');
  });
});

describe('BrainAgentPlanner', () => {
  const layer = createInMemoryIntelligenceLayer();

  const mockAdminData: AdminDataPort = {
    countProducts: jest.fn(),
    countLowMarginProducts: jest.fn(),
    updateProductPrices: jest.fn(),
    updateProductPricesByIds: jest.fn(),
    restoreProductPrices: jest.fn(),
    listInventoryItems: jest.fn(),
    listRecentOrders: jest.fn(),
    countEmailsByStatus: jest.fn(),
    countOutcomesByStatus: jest.fn(),
    countForecasts: jest.fn(),
    countPendingApprovals: jest.fn(),
    listPendingApprovals: jest.fn(),
    approveLowRisk: jest.fn(),
    createSupplier: jest.fn(),
    createProduct: jest.fn(),
    listSuppliers: jest.fn(),
    findLatestProposedOutcome: jest.fn(),
    countRecentCommands: jest.fn(),
    listLowStockInventory: jest.fn(),
    listProductsForBrain: jest.fn(),
    searchProductsByName: jest.fn(),
  };

  const tools = new PersonalBrainToolRegistry({
    adminData: mockAdminData,
    personalBrains: layer.personalBrainRegistry,
  });

  beforeEach(() => {
    process.env.COMMAND_BRAIN_PLANNING_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.COMMAND_BRAIN_PLANNING_ENABLED;
  });

  it('generates structured plan from LLM JSON', async () => {
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          goal: 'Prijzen optimaliseren',
          reasoning: 'Eerst data, dan voorstel',
          steps: [
            { label: 'Haal huidige prijzen op', toolHint: 'search_products', riskHint: 'low' },
            { label: 'Maak goedkeuring aan', toolHint: 'updatePrice', riskHint: 'high' },
          ],
        })
      ),
    };

    const planner = new BrainAgentPlanner(tools, mockLlm);
    const plan = await planner.generatePlan({
      command: 'Optimaliseer prijzen voor earbuds',
      parsedIntent: 'PRICE_UPDATE',
      contextSnippets: ['Product: Wireless Earbuds'],
      handlerResult: 'Handler skipped',
    });

    expect(plan.goal).toBe('Prijzen optimaliseren');
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].toolHint).toBe('search_products');
  });

  it('returns single-step plan when LLM fails', async () => {
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockRejectedValue(new Error('LLM down')),
    };

    const planner = new BrainAgentPlanner(tools, mockLlm);
    const plan = await planner.generatePlan({
      command: 'Test command',
      parsedIntent: 'UNKNOWN',
      contextSnippets: [],
      handlerResult: 'ok',
    });

    expect(plan.steps).toHaveLength(1);
    expect(plan.goal).toBe('Test command');
  });

  it('includes collective snippets in prompt', async () => {
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({ goal: 'Plan', steps: [{ label: 'Stap 1' }] })
      ),
    };

    const planner = new BrainAgentPlanner(tools, mockLlm);
    await planner.generatePlan({
      command: 'Test',
      parsedIntent: 'PRICE_UPDATE',
      contextSnippets: [],
      handlerResult: 'ok',
      collectiveSnippets: ['Merchants prefer gradual price changes'],
    });

    const prompt = (mockLlm.generate as jest.Mock).mock.calls[0][0].prompt as string;
    expect(prompt).toContain('Collectieve merchant intelligence');
    expect(prompt).toContain('gradual price changes');
  });

  it('skips planning when disabled', async () => {
    process.env.COMMAND_BRAIN_PLANNING_ENABLED = 'false';
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn(),
    };

    const planner = new BrainAgentPlanner(tools, mockLlm);
    const plan = await planner.generatePlan({
      command: 'Quick task',
      parsedIntent: 'UNKNOWN',
      contextSnippets: [],
      handlerResult: 'ok',
    });

    expect(mockLlm.generate).not.toHaveBeenCalled();
    expect(plan.steps).toHaveLength(1);
  });
});
