import { meetsKAnonymity, addLaplaceNoise } from '../federated/privacyUtils';
import { DistillationSafetyClassifier } from '../distillation/DistillationServices';

describe('privacyUtils', () => {
  it('meetsKAnonymity requires min tenants and samples', () => {
    expect(meetsKAnonymity(5, 10)).toBe(true);
    expect(meetsKAnonymity(4, 10)).toBe(false);
    expect(meetsKAnonymity(5, 9)).toBe(false);
  });

  it('addLaplaceNoise perturbs value', () => {
    const samples = Array.from({ length: 20 }, () => addLaplaceNoise(1, 1, 0.5));
    expect(samples.some((v) => v !== 1)).toBe(true);
  });
});

describe('DistillationSafetyClassifier', () => {
  const classifier = new DistillationSafetyClassifier();

  it('rejects PII in content', () => {
    const result = classifier.classify('Contact merchant@example.com for pricing', 5);
    expect(result.safe).toBe(false);
    expect(result.reasons).toContain('pii_detected');
  });

  it('accepts safe generalized pattern', () => {
    const result = classifier.classify(
      'When handling PRICE_UPDATE requests, verify margin stays above 15%',
      5
    );
    expect(result.safe).toBe(true);
  });
});
