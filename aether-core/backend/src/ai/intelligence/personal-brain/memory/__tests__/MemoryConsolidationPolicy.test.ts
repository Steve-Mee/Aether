import { shouldPromoteToLongTerm, truncateOutcome } from '../MemoryConsolidationPolicy';

describe('MemoryConsolidationPolicy', () => {
  it('does not promote UNKNOWN or low confidence', () => {
    expect(
      shouldPromoteToLongTerm({
        tenantId: 't',
        command: 'x',
        intent: 'UNKNOWN',
        outcome: 'ok',
        success: true,
        confidence: 0.9,
      }).promote
    ).toBe(false);

    expect(
      shouldPromoteToLongTerm({
        tenantId: 't',
        command: 'x',
        intent: 'PRICE_UPDATE',
        outcome: 'ok',
        success: true,
        confidence: 0.3,
      }).promote
    ).toBe(false);
  });

  it('promotes mutating intents with high priority when goal reached', () => {
    const decision = shouldPromoteToLongTerm({
      tenantId: 't',
      command: 'Verhoog prijzen',
      intent: 'PRICE_UPDATE',
      outcome: 'Marge +2%',
      success: true,
      confidence: 0.9,
      goalReached: true,
      verifiedUplift: 2.5,
    });
    expect(decision.promote).toBe(true);
    expect(decision.priority).toBe('high');
    expect(decision.expiresAt).toBeUndefined();
  });

  it('promotes medium priority with expiry for mutating intents', () => {
    const decision = shouldPromoteToLongTerm({
      tenantId: 't',
      command: 'Verhoog prijzen',
      intent: 'PRICE_UPDATE',
      outcome: 'Done',
      success: true,
      confidence: 0.8,
    });
    expect(decision.promote).toBe(true);
    expect(decision.priority).toBe('medium');
    expect(decision.expiresAt).toBeDefined();
  });

  it('truncates long outcomes', () => {
    const long = 'a'.repeat(400);
    expect(truncateOutcome(long).length).toBeLessThanOrEqual(300);
  });
});
