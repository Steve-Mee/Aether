import { createInsightCommitment, verifyInsightCommitment } from '../ZkProofService';

describe('ZkProofService', () => {
  const input = {
    merchantId: 'anon_m_1',
    category: 'pricing',
    metric: 'conversion_rate',
    value: 0.42,
    sampleSize: 100,
    timestamp: new Date('2026-05-31T12:00:00.000Z'),
  };

  it('creates stable commitment hash', () => {
    const proof = createInsightCommitment(input);
    expect(proof).toHaveLength(64);
    expect(verifyInsightCommitment(proof, input)).toBe(true);
  });

  it('rejects tampered values', () => {
    const proof = createInsightCommitment(input);
    expect(verifyInsightCommitment(proof, { ...input, value: 0.99 })).toBe(false);
  });
});
