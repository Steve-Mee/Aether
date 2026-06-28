import { PlanMemoryService } from '../PlanMemoryService';
import { createInMemoryIntelligenceLayer } from '../../createIntelligenceLayer';

describe('PlanMemoryService', () => {
  const layer = createInMemoryIntelligenceLayer();
  const service = new PlanMemoryService(layer.personalBrainRegistry);

  it('remembers and recalls agent plans', async () => {
    await service.rememberPlan('tenant_pm', {
      command: 'Optimaliseer prijzen voor earbuds',
      plan: {
        goal: 'Prijzen optimaliseren',
        steps: [
          { index: 1, label: 'Zoek producten', toolHint: 'search_products' },
          { index: 2, label: 'Maak voorstel', toolHint: 'updatePrice' },
        ],
      },
      summary: {
        goalReached: true,
        completedSteps: [],
        failedSteps: [],
        pendingApprovals: 0,
        narrative: 'Klaar',
      },
    });

    const recalled = await service.recallSimilarPlans(
      'tenant_pm',
      'Optimaliseer prijzen voor earbuds'
    );
    expect(recalled.length).toBeGreaterThan(0);
    expect(recalled[0].goal).toBe('Prijzen optimaliseren');
    expect(recalled[0].steps).toHaveLength(2);
  });

  it('uses AGENT_PLAN intent for storage', async () => {
    const brain = layer.personalBrainRegistry.get('tenant_prefix', 'admin');
    const id = await brain.remember({
      command: 'test command',
      intent: 'AGENT_PLAN',
      result: JSON.stringify({ goal: 'Test', steps: [{ index: 1, label: 'Stap' }], success: true }),
    });
    expect(id).toBeTruthy();
  });
});
