import { classifyMultiAgentMode } from '../ExecutionModeClassifier';

describe('ExecutionModeClassifier', () => {
  it('returns parallel when all intents are read-only', () => {
    expect(
      classifyMultiAgentMode([
        { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
        { agentKey: 'mail', intent: 'EMAIL_SUMMARY' },
      ])
    ).toBe('parallel');
  });

  it('returns sequential when any intent is mutating', () => {
    expect(
      classifyMultiAgentMode([
        { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
        { agentKey: 'pricing', intent: 'PRICE_UPDATE' },
      ])
    ).toBe('sequential');
  });

  it('returns sequential for RESTOCK_SUGGEST', () => {
    expect(
      classifyMultiAgentMode([
        { agentKey: 'inventory', intent: 'RESTOCK_SUGGEST' },
        { agentKey: 'pricing', intent: 'LOW_MARGIN_REPORT' },
      ])
    ).toBe('sequential');
  });
});
