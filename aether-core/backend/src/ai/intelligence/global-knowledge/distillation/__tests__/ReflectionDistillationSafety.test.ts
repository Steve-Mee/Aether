import { DistillationSafetyClassifier } from '../DistillationServices';

describe('DistillationSafetyClassifier reflection content', () => {
  const classifier = new DistillationSafetyClassifier();

  it('rejects content with merchant order ids', () => {
    const result = classifier.classifyReflectionContent(
      'When order_12345 fails, retry with approval',
      5
    );
    expect(result.safe).toBe(false);
    expect(result.reasons).toContain('merchant_data_detected');
  });

  it('accepts anonymized general patterns', () => {
    const result = classifier.classifyReflectionContent(
      'When handling supplier monitor requests, verify changes before auto-apply',
      5
    );
    expect(result.safe).toBe(true);
  });
});
