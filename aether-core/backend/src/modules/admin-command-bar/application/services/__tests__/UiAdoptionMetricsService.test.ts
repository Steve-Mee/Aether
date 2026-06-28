import { computeUiAdoptionMetrics } from '../UiAdoptionMetricsService';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    command: {
      findMany: jest.fn().mockResolvedValue([
        { intent: 'APPROVE_CHANGES' },
        { intent: 'UNKNOWN' },
      ]),
    },
    auditLog: {
      count: jest
        .fn()
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2),
    },
    approval: {
      count: jest.fn().mockResolvedValueOnce(1),
    },
  },
}));

describe('computeUiAdoptionMetrics', () => {
  it('computes nl share, time saved, and low-risk autonomous 24h', async () => {
    const m = await computeUiAdoptionMetrics('tenant_a');
    expect(m.commands7d).toBe(2);
    expect(m.manualNavEvents7d).toBe(4);
    expect(m.nlActionShare7d).toBeCloseTo(2 / 6);
    expect(m.timeSavedMinutes7d).toBe(5 + 2);
    expect(m.autonomousActions7d).toBe(10);
    expect(m.lowRiskAutonomous24h).toBe(3);
  });
});
