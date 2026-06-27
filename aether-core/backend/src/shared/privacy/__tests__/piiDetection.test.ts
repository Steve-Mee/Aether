import { scanWithRegex } from '../../../shared/privacy/PiiPatternLibrary';
import { RegexPiiDetector } from '../../../shared/privacy/RegexPiiDetector';

describe('PiiPatternLibrary', () => {
  it('detects email in text', () => {
    expect(scanWithRegex('contact merchant@shop.nl')).toContain('email');
  });

  it('returns empty for safe structured metric string', () => {
    expect(scanWithRegex('pricing:auto_apply_rate:1')).toEqual([]);
  });
});

describe('RegexPiiDetector', () => {
  const detector = new RegexPiiDetector();

  it('allows structured metric format', async () => {
    const result = await detector.scan('pricing:auto_apply_rate:1', {
      allowStructuredMetrics: true,
    });
    expect(result.safe).toBe(true);
  });
});
