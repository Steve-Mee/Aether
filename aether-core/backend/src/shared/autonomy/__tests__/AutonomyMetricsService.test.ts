jest.mock('../../prisma/client', () => ({
  prisma: {
    decision: {
      findMany: jest.fn().mockResolvedValue([
        { type: 'mail.classify' },
        { type: 'payment.process' },
      ]),
    },
    approval: { findMany: jest.fn().mockResolvedValue([{ status: 'pending' }]) },
    command: { findMany: jest.fn().mockResolvedValue([{ id: 'cmd_1' }]) },
  },
}));

import { getAutonomyMetrics } from '../AutonomyMetricsService';

describe('AutonomyMetricsService', () => {
  it('computes autonomy rate and pilot target', async () => {
    const metrics = await getAutonomyMetrics('tenant_default', 30);
    expect(metrics.totalDecisions).toBe(4);
    expect(metrics.autonomyRate).toBe(0.75);
    expect(metrics.targetMet).toBe(true);
  });
});
