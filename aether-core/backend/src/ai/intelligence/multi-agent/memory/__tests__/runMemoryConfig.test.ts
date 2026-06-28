import {
  canReadRunMemoryKey,
  canListRunMemoryNamespace,
  canWriteRunMemoryKey,
  RUN_MEMORY_WRITE_SCOPE,
} from '../runMemoryConfig';
import { validateSharedMemoryValue, normalizePeerPayloadToSharedKey } from '../sharedMemorySchema';

describe('runMemoryConfig', () => {
  it('allows shared namespace writes for agents with shared scope', () => {
    expect(canWriteRunMemoryKey('pricing', 'shared', 'priceProposals')).toBe(true);
  });

  it('allows supplier to write priceDrops to shared', () => {
    expect(canWriteRunMemoryKey('supplier', 'shared', 'priceDrops')).toBe(true);
  });

  it('allows agent-specific keys in agent namespace', () => {
    expect(canWriteRunMemoryKey('promotion', 'promotion', 'promotionProposals')).toBe(true);
  });

  it('denies cross-agent namespace writes', () => {
    expect(canWriteRunMemoryKey('inventory', 'pricing', 'marginAnalysis')).toBe(false);
  });

  it('allows pricing to read supplier namespace', () => {
    expect(canReadRunMemoryKey('pricing', 'supplier', 'lastNarrative')).toBe(true);
  });

  it('denies inventory reading negotiation namespace', () => {
    expect(canReadRunMemoryKey('inventory', 'negotiation', 'roundState')).toBe(false);
  });

  it('allows list on shared namespace for all agents', () => {
    expect(canListRunMemoryNamespace('inventory', 'shared')).toBe(true);
  });

  it('defines write scope for negotiation and supervisor', () => {
    expect(RUN_MEMORY_WRITE_SCOPE.negotiation).toContain('roundState');
    expect(RUN_MEMORY_WRITE_SCOPE.workflow_supervisor).toContain('subPlan');
  });
});

describe('sharedMemorySchema', () => {
  it('validates array keys in shared namespace', () => {
    expect(validateSharedMemoryValue('priceDrops', [{ sku: 'A' }]).ok).toBe(true);
    expect(validateSharedMemoryValue('priceDrops', {}).ok).toBe(false);
  });

  it('normalizes peer payload to canonical keys', () => {
    const writes = normalizePeerPayloadToSharedKey('supplier', {
      priceDrops: [{ sku: 'X', changePct: 5 }],
      suggestedPricingActions: [{ action: 'increase' }],
    });
    expect(writes.map((w) => w.key)).toEqual(['priceDrops', 'suggestedPricingActions']);
  });
});
