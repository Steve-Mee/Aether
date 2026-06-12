import { describe, expect, it } from 'vitest';
import {
  autonomyLabel,
  resolveExecutionMode,
  resolveExecutionModeFromResult,
} from './actionAutonomy';

describe('resolveExecutionMode', () => {
  it('returns approval_required when requiresApproval is true', () => {
    expect(resolveExecutionMode({ requiresApproval: true, riskBand: 'low' })).toBe(
      'approval_required',
    );
  });

  it('returns approval_required when riskBand is high', () => {
    expect(resolveExecutionMode({ requiresApproval: false, riskBand: 'high' })).toBe(
      'approval_required',
    );
  });

  it('returns inform_only when riskBand is medium', () => {
    expect(resolveExecutionMode({ requiresApproval: false, riskBand: 'medium' })).toBe(
      'inform_only',
    );
  });

  it('returns autonomous for low risk without approval', () => {
    expect(resolveExecutionMode({ requiresApproval: false, riskBand: 'low' })).toBe('autonomous');
  });

  it('defaults to autonomous when bands are undefined', () => {
    expect(resolveExecutionMode({})).toBe('autonomous');
  });
});

describe('resolveExecutionModeFromResult', () => {
  it('maps CommandResult fields', () => {
    expect(
      resolveExecutionModeFromResult({
        success: true,
        result: '',
        parsedIntent: 'X',
        confidence: 0.9,
        requiresApproval: true,
        riskBand: 'low',
      }),
    ).toBe('approval_required');
  });
});

describe('autonomyLabel', () => {
  it('returns Dutch labels', () => {
    expect(autonomyLabel('autonomous')).toBe('Autonoom mogelijk');
    expect(autonomyLabel('approval_required')).toBe('Goedkeuring vereist');
    expect(autonomyLabel('inform_only')).toBe('Ter informatie');
  });
});
