import { HiveMindGlobalBrain } from '../HiveMindGlobalBrain';

describe('HiveMindGlobalBrain', () => {
  it('returns collective insights when aggregation has enough samples', async () => {
    const queryInsights = {
      execute: jest.fn().mockResolvedValue({
        average: 0.5,
        min: 0.1,
        max: 0.9,
        sampleSize: 10,
        confidence: 0.85,
      }),
    };
    const brain = new HiveMindGlobalBrain(queryInsights as any);
    const insights = await brain.getCollectiveInsights('tenant_a', ['pricing']);
    expect(insights.length).toBe(1);
    expect(insights[0].category).toBe('pricing');
    expect(insights[0].sampleSize).toBe(10);
  });

  it('returns empty when not enough samples', async () => {
    const queryInsights = {
      execute: jest.fn().mockResolvedValue({ message: 'Not enough', sampleSize: 2 }),
    };
    const brain = new HiveMindGlobalBrain(queryInsights as any);
    const insights = await brain.getCollectiveInsights('tenant_a', ['pricing']);
    expect(insights).toEqual([]);
  });
});
