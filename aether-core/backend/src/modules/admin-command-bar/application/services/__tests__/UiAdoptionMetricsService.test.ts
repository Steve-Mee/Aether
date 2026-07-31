import { UiAdoptionMetricsService } from '../UiAdoptionMetricsService';
import type { UiAdoptionMetricsPort } from '../../ports/UiAdoptionMetricsPort';

describe('UiAdoptionMetricsService', () => {
  const metricsPort: jest.Mocked<UiAdoptionMetricsPort> = {
    getCommandIntentsSince: jest.fn().mockResolvedValue([
      { intent: 'APPROVE_CHANGES' },
      { intent: 'UNKNOWN' },
    ]),
    countNavEventsSince: jest.fn().mockResolvedValue(4),
    countAutonomyAuditsSince: jest.fn().mockResolvedValue(10),
    countPolicyAutoApprovalsSince: jest.fn().mockResolvedValue(1),
    countAutonomyExecuteSince: jest.fn().mockResolvedValue(2),
  };

  it('computes nl share, time saved, and low-risk autonomous 24h', async () => {
    const service = new UiAdoptionMetricsService(metricsPort);
    const m = await service.compute('tenant_a');
    expect(m.commands7d).toBe(2);
    expect(m.manualNavEvents7d).toBe(4);
    expect(m.nlActionShare7d).toBeCloseTo(2 / 6);
    expect(m.timeSavedMinutes7d).toBe(5 + 2);
    expect(m.autonomousActions7d).toBe(10);
    expect(m.lowRiskAutonomous24h).toBe(3);
  });
});
