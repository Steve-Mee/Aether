import { logAutonomyDecision } from '../AutonomyAuditLogger';
import { writeAuditLog } from '../../audit/auditService';

jest.mock('../../audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

describe('AutonomyAuditLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs allowed decisions', async () => {
    await logAutonomyDecision({
      tenantId: 't1',
      source: 'proactive',
      assessment: {
        executionMode: 'autonomous',
        eligible: true,
        reason: 'ok',
        reasonCode: 'low_risk_allowed',
        riskClass: 'low',
        category: 'pricing',
        guardrails: { highRiskAlwaysApproval: true },
      },
      preset: 'balanced',
      relatedId: 'sug-1',
    });

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'autonomy_action_allowed',
        details: expect.objectContaining({
          source: 'proactive',
          category: 'pricing',
          reasonCode: 'low_risk_allowed',
        }),
      }),
    );
  });

  it('logs blocked decisions', async () => {
    await logAutonomyDecision({
      tenantId: 't1',
      source: 'brain_tool',
      assessment: {
        executionMode: 'blocked',
        eligible: false,
        reason: 'category off',
        reasonCode: 'category_disabled',
        riskClass: 'low',
        category: 'supplier',
        guardrails: { highRiskAlwaysApproval: true },
      },
    });

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'autonomy_action_blocked' }),
    );
  });
});
