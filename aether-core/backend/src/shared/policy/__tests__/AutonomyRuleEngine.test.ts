import { matchAutonomyRules } from '../AutonomyRuleEngine';
import type { AutonomyCustomRule } from '../../settings/autonomyTypes';

describe('AutonomyRuleEngine', () => {
  const rules: AutonomyCustomRule[] = [
    {
      id: 'allow_small',
      enabled: true,
      name: 'Small margin',
      sortOrder: 0,
      outcome: 'allow_auto',
      conditions: [{ field: 'marginImpactEuro', operator: 'lte', value: 100 }],
    },
    {
      id: 'block_large',
      enabled: true,
      name: 'Block large',
      sortOrder: 1,
      outcome: 'block',
      conditions: [{ field: 'marginImpactEuro', operator: 'gt', value: 5000 }],
    },
    {
      id: 'disabled',
      enabled: false,
      name: 'Disabled',
      sortOrder: 2,
      outcome: 'block',
      conditions: [{ field: 'marginImpactEuro', operator: 'gt', value: 0 }],
    },
  ];

  it('matches first enabled rule in sort order', () => {
    const match = matchAutonomyRules(rules, {
      marginImpactEuro: 50,
      priceChangePct: 0,
      category: 'pricing',
      riskClass: 'low',
    });
    expect(match?.rule.id).toBe('allow_small');
    expect(match?.outcome).toBe('allow_auto');
  });

  it('skips disabled rules', () => {
    const match = matchAutonomyRules(rules, {
      marginImpactEuro: 6000,
      priceChangePct: 0,
      category: 'pricing',
      riskClass: 'medium',
    });
    expect(match?.rule.id).toBe('block_large');
  });

  it('returns null when no rule matches', () => {
    const match = matchAutonomyRules(rules, {
      marginImpactEuro: 200,
      priceChangePct: 0,
      category: 'pricing',
      riskClass: 'low',
    });
    expect(match).toBeNull();
  });
});
