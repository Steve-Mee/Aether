import { getEmailMetrics } from '../application/services/EmailMetricsService';
import type { EmailAnalyticsPort } from '../application/ports/EmailAnalyticsPort';

describe('EmailMetricsService', () => {
  it('computes classification and escalation rates with roadmap targets', async () => {
    const analytics: EmailAnalyticsPort = {
      listEmailsSince: jest.fn().mockResolvedValue([
        { category: 'order', status: 'replied' },
        { category: 'support', status: 'received' },
        { category: null, status: 'escalated' },
        { category: 'invoice', status: 'replied' },
      ]),
      listProcessedAuditLogsSince: jest.fn().mockResolvedValue([
        { details: JSON.stringify({ classification: { source: 'ollama' } }) },
        { details: JSON.stringify({ classification: { source: 'heuristic' } }) },
      ]),
      countRollbackAuditLogsSince: jest.fn().mockResolvedValue(0),
    };
    const metrics = await getEmailMetrics('tenant_default', 30, analytics);
    expect(metrics.totalProcessed).toBe(4);
    expect(metrics.pilotProcessedCount).toBe(3);
    expect(metrics.autoReplyRate).toBeCloseTo(2 / 3);
    expect(metrics.classifiedCount).toBe(3);
    expect(metrics.classificationRate).toBe(0.75);
    expect(metrics.escalationRate).toBe(0.25);
    expect(metrics.targetsMet.classificationAbove60Pct).toBe(true);
    expect(metrics.targetsMet.escalationBelow15Pct).toBe(false);
    expect(metrics.classificationSource.ollama).toBe(1);
    expect(metrics.classificationSource.heuristic).toBe(1);
  });
});
