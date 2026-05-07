import { Insight } from '../../domain/entities/Insight';

export class AggregationService {
  aggregateInsights(insights: Insight[]): any {
    if (insights.length === 0) return null;

    const values = insights.map(i => i.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      average: parseFloat(avg.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      sampleSize: insights.length,
      confidence: parseFloat((insights.reduce((a, b) => a + b.confidence, 0) / insights.length).toFixed(2))
    };
  }
}