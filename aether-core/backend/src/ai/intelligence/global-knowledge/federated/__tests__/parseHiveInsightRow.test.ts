import { parseHiveInsightRow } from '../parseHiveInsightRow';

describe('parseHiveInsightRow', () => {
  it('reads category from type column (hive repository shape)', () => {
    const result = parseHiveInsightRow({
      type: 'pricing',
      content: JSON.stringify({
        merchantId: 'anon_abc',
        metric: 'auto_apply_rate',
        value: 1,
        sampleSize: 1,
      }),
    });
    expect(result).toEqual({
      category: 'pricing',
      metric: 'auto_apply_rate',
      value: 1,
    });
  });

  it('falls back to category in JSON when type empty', () => {
    const result = parseHiveInsightRow({
      type: '',
      content: JSON.stringify({
        category: 'conversion',
        metric: 'mail_auto_reply_rate',
        value: 0.8,
      }),
    });
    expect(result?.category).toBe('conversion');
  });

  it('returns null for invalid JSON or missing fields', () => {
    expect(parseHiveInsightRow({ type: 'pricing', content: 'not-json' })).toBeNull();
    expect(parseHiveInsightRow({ type: 'pricing', content: '{}' })).toBeNull();
  });
});
