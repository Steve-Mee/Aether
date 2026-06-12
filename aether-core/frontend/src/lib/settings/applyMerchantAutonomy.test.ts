import { describe, expect, it } from 'vitest';
import {
  applyMerchantAutonomy,
  resolveMerchantExecutionModeFromResult,
} from './applyMerchantAutonomy';
import { DEFAULT_MERCHANT_SETTINGS } from './merchantSettingsTypes';

const base = DEFAULT_MERCHANT_SETTINGS;

describe('applyMerchantAutonomy', () => {
  it('returns approval_required when policy disabled', () => {
    expect(
      applyMerchantAutonomy(
        { ...base, policyEnabled: false },
        { riskBand: 'low', requiresApproval: false },
      ),
    ).toBe('approval_required');
  });

  it('returns approval_required when auto low-risk is off', () => {
    expect(
      applyMerchantAutonomy(
        { ...base, autoApproveLowRisk: false },
        { riskBand: 'low', requiresApproval: false },
      ),
    ).toBe('approval_required');
  });

  it('downgrades to inform_only outside auto-run window', () => {
    const noon = new Date('2026-06-03T12:00:00');
    expect(
      applyMerchantAutonomy(
        {
          ...base,
          autoRunWindow: 'custom',
          autoRunWindowStart: '18:00',
          autoRunWindowEnd: '08:00',
        },
        { riskBand: 'low', requiresApproval: false },
        noon,
      ),
    ).toBe('inform_only');
  });

  it('returns approval_required when margin impact exceeds cap', () => {
    expect(
      applyMerchantAutonomy(base, {
        riskBand: 'low',
        requiresApproval: false,
        marginImpactEuro: 750,
      }),
    ).toBe('approval_required');
  });

  it('low autonomy level downgrades low-risk to inform_only', () => {
    expect(
      applyMerchantAutonomy(
        { ...base, autonomyLevel: 'low' },
        { riskBand: 'low', requiresApproval: false },
      ),
    ).toBe('inform_only');
  });

  it('high autonomy level allows medium-risk autonomous', () => {
    expect(
      applyMerchantAutonomy(
        { ...base, autonomyLevel: 'high' },
        { riskBand: 'medium', requiresApproval: false },
      ),
    ).toBe('autonomous');
  });

  it('always requires approval for high risk', () => {
    expect(applyMerchantAutonomy(base, { riskBand: 'high', requiresApproval: true })).toBe(
      'approval_required',
    );
  });

  it('resolveMerchantExecutionModeFromResult downgrades low-risk demo response when auto off', () => {
    expect(
      resolveMerchantExecutionModeFromResult(
        { ...base, autoApproveLowRisk: false },
        { riskBand: 'low', requiresApproval: false },
      ),
    ).toBe('approval_required');
    expect(
      resolveMerchantExecutionModeFromResult(base, {
        riskBand: 'low',
        requiresApproval: false,
      }),
    ).toBe('autonomous');
  });
});
