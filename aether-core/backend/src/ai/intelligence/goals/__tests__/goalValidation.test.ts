import {
  computeExpectedProgressPct,
  computeProgressPct,
  validateCreateGoalInput,
  GoalValidationError,
} from '../goalValidation';
import type { CreateGoalInput } from '../types';

function baseInput(overrides: Partial<CreateGoalInput> = {}): CreateGoalInput {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);
  return {
    title: 'Verhoog marge',
    metricType: 'margin',
    targetValue: 22,
    baselineValue: 20,
    deadline: deadline.toISOString(),
    ...overrides,
  };
}

describe('computeProgressPct', () => {
  it('calculates increase progress', () => {
    expect(computeProgressPct(25, 20, 30, 'increase')).toBe(50);
    expect(computeProgressPct(30, 20, 30, 'increase')).toBe(100);
  });

  it('calculates decrease progress', () => {
    expect(computeProgressPct(7, 10, 5, 'decrease')).toBe(60);
  });

  it('clamps between 0 and 100', () => {
    expect(computeProgressPct(10, 20, 30, 'increase')).toBe(0);
    expect(computeProgressPct(40, 20, 30, 'increase')).toBe(100);
  });
});

describe('computeExpectedProgressPct', () => {
  it('returns 0 at start and increases over time', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const deadline = new Date('2026-02-01T00:00:00Z');
    const mid = new Date('2026-01-16T12:00:00Z');
    expect(computeExpectedProgressPct(deadline, created, created)).toBe(0);
    expect(computeExpectedProgressPct(deadline, created, mid)).toBeGreaterThan(40);
  });
});

describe('validateCreateGoalInput', () => {
  it('accepts realistic margin goal', () => {
    expect(() => validateCreateGoalInput(baseInput())).not.toThrow();
  });

  it('rejects too-short horizon', () => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 2);
    expect(() => validateCreateGoalInput(baseInput({ deadline: deadline.toISOString() }))).toThrow(
      GoalValidationError
    );
  });

  it('rejects overly ambitious target', () => {
    expect(() =>
      validateCreateGoalInput(baseInput({ baselineValue: 20, targetValue: 80 }))
    ).toThrow(GoalValidationError);
  });

  it('requires category for category_revenue', () => {
    expect(() =>
      validateCreateGoalInput(
        baseInput({ metricType: 'category_revenue', metricScope: {} })
      )
    ).toThrow(GoalValidationError);
  });
});
