import { AgentRunContributionExtractor } from '../AgentRunContributionExtractor';

describe('AgentRunContributionExtractor', () => {
  const extractor = new AgentRunContributionExtractor();

  it('returns empty when tool trace too short', () => {
    const insights = extractor.extract({
      parsedIntent: 'PRICE_UPDATE',
      goalReached: true,
      summary: {
        goalReached: true,
        completedSteps: [{ label: 'step 1' }],
        failedSteps: [],
        pendingApprovals: 0,
        narrative: 'done',
      },
      toolTrace: [{ tool: 'search_products', input: {}, output: 'ok', status: 'ok' }],
    });
    expect(insights).toEqual([]);
  });

  it('extracts metrics without narrative content', () => {
    const insights = extractor.extract({
      parsedIntent: 'PRICE_UPDATE',
      goalReached: true,
      summary: {
        goalReached: true,
        completedSteps: [{ label: 'Zoek product X', tool: 'search_products' }],
        failedSteps: [],
        pendingApprovals: 0,
        narrative: 'Merchant-specific narrative with secret SKU-123',
      },
      toolTrace: [
        { tool: 'search_products', input: {}, output: 'ok', status: 'ok' },
        { tool: 'updatePrice', input: {}, output: 'ok', status: 'ok' },
      ],
    });

    expect(insights.length).toBeGreaterThan(0);
    for (const insight of insights) {
      expect(JSON.stringify(insight)).not.toMatch(/SKU|narrative|Merchant/i);
      expect(insight.category).toMatch(/^(pricing|conversion|trend|inventory|marketing)$/);
    }
    expect(insights.some((i) => i.metric === 'price_change_success_rate')).toBe(true);
    expect(insights.some((i) => i.metric === 'updatePrice_success_rate')).toBe(true);
  });
});
