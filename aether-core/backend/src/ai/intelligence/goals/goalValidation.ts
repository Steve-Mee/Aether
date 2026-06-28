import {
  GOAL_MAX_HORIZON_DAYS,
  GOAL_MAX_RELATIVE_CHANGE,
  GOAL_MIN_HORIZON_DAYS,
} from './goalConfig';
import type { CreateGoalInput, GoalMetricType } from './types';
import { GOAL_METRIC_DEFAULTS } from './types';

export class GoalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoalValidationError';
  }
}

export function validateCreateGoalInput(input: CreateGoalInput): void {
  if (!input.title?.trim()) {
    throw new GoalValidationError('Titel is verplicht.');
  }
  if (!input.metricType || !(input.metricType in GOAL_METRIC_DEFAULTS)) {
    throw new GoalValidationError('Ongeldig metriektype.');
  }
  if (!Number.isFinite(input.targetValue)) {
    throw new GoalValidationError('Doelwaarde moet een getal zijn.');
  }

  const deadline = new Date(input.deadline);
  if (Number.isNaN(deadline.getTime())) {
    throw new GoalValidationError('Ongeldige deadline.');
  }

  const now = Date.now();
  const horizonDays = (deadline.getTime() - now) / 86_400_000;
  if (horizonDays < GOAL_MIN_HORIZON_DAYS) {
    throw new GoalValidationError(
      `Deadline moet minimaal ${GOAL_MIN_HORIZON_DAYS} dagen in de toekomst liggen.`
    );
  }
  if (horizonDays > GOAL_MAX_HORIZON_DAYS) {
    throw new GoalValidationError(
      `Deadline mag maximaal ${GOAL_MAX_HORIZON_DAYS} dagen in de toekomst liggen.`
    );
  }

  const baseline = input.baselineValue ?? 0;
  if (!Number.isFinite(baseline)) {
    throw new GoalValidationError('Baseline moet een getal zijn.');
  }

  const direction = input.direction ?? GOAL_METRIC_DEFAULTS[input.metricType].direction;
  validateRealisticTarget(input.metricType, baseline, input.targetValue, direction, horizonDays);

  if (input.metricType === 'category_revenue') {
    const scope = input.metricScope ?? {};
    if (!scope.categoryId && !scope.productSlug) {
      throw new GoalValidationError('Categorie-doelen vereisen een categoryId of productSlug.');
    }
  }
}

function validateRealisticTarget(
  metricType: GoalMetricType,
  baseline: number,
  target: number,
  direction: 'increase' | 'decrease',
  horizonDays: number
): void {
  if (baseline === target) {
    throw new GoalValidationError('Doelwaarde moet verschillen van de baseline.');
  }

  const maxChange = GOAL_MAX_RELATIVE_CHANGE[metricType] ?? 0.3;
  const scaleFactor = Math.min(1, horizonDays / 90);
  const allowedChange = maxChange * scaleFactor;

  if (direction === 'increase' && target <= baseline) {
    throw new GoalValidationError('Doelwaarde moet hoger zijn dan baseline voor een stijgingsdoel.');
  }
  if (direction === 'decrease' && target >= baseline) {
    throw new GoalValidationError('Doelwaarde moet lager zijn dan baseline voor een dalingdoel.');
  }

  const relativeChange = Math.abs(target - baseline) / (Math.abs(baseline) || 1);
  if (relativeChange > allowedChange + 0.001) {
    const pct = Math.round(allowedChange * 100);
    throw new GoalValidationError(
      `Doel is te ambitieus voor deze periode. Maximaal ~${pct}% verandering toegestaan.`
    );
  }
}

export function computeProgressPct(
  current: number,
  baseline: number,
  target: number,
  direction: 'increase' | 'decrease'
): number {
  if (target === baseline) return 0;
  let raw: number;
  if (direction === 'increase') {
    raw = ((current - baseline) / (target - baseline)) * 100;
  } else {
    raw = ((baseline - current) / (baseline - target)) * 100;
  }
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
}

export function computeExpectedProgressPct(deadline: Date, createdAt: Date, now = new Date()): number {
  const total = deadline.getTime() - createdAt.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - createdAt.getTime();
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 1000) / 10));
}
