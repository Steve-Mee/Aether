import {
  computeMaskedValue,
  pairwiseMask,
  personalMask,
  unmaskAggregate,
} from '../pairwiseMask';

describe('pairwiseMask SecAgg', () => {
  const roundId = 'round_test_1';

  it('pairwise masks are antisymmetric', () => {
    const ab = pairwiseMask(roundId, 'tenant_a', 'tenant_b');
    const ba = pairwiseMask(roundId, 'tenant_b', 'tenant_a');
    expect(ab).toBeCloseTo(-ba, 5);
  });

  it('recovers aggregate sum from masked values', () => {
    const tenants = ['t1', 't2', 't3'];
    const values = [0.8, 1.0, 0.6];
    const updates = tenants.map((tenantId, i) => {
      const secret = `secret_${tenantId}`;
      const { maskedValue, personalMaskValue } = computeMaskedValue(
        roundId,
        tenantId,
        values[i]!,
        secret,
        tenants
      );
      return { maskedValue, personalMask: personalMaskValue };
    });

    const sum = unmaskAggregate(updates);
    expect(sum / tenants.length).toBeCloseTo(
      values.reduce((a, b) => a + b, 0) / values.length,
      5
    );
  });

  it('personalMask is deterministic per round and tenant', () => {
    expect(personalMask(roundId, 't1', 'seed')).toBe(personalMask(roundId, 't1', 'seed'));
  });
});
