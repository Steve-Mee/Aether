export type ReflectionNextAction = 'continue' | 'replan' | 'conclude';

export interface StepReflection {
  sufficient: boolean;
  goalReached: boolean;
  observation: string;
  nextAction: ReflectionNextAction;
  revisedGoal?: string;
}

export function isReflectionEnabled(): boolean {
  return process.env.COMMAND_BRAIN_REFLECTION_ENABLED !== 'false';
}

export function isDynamicReplanEnabled(): boolean {
  return process.env.COMMAND_BRAIN_DYNAMIC_REPLAN_ENABLED !== 'false';
}

export function normalizeStepReflection(raw: unknown): StepReflection {
  if (!raw || typeof raw !== 'object') {
    return {
      sufficient: true,
      goalReached: false,
      observation: 'Doorgaan met plan.',
      nextAction: 'continue',
    };
  }
  const obj = raw as Record<string, unknown>;
  const nextAction =
    obj.nextAction === 'replan' || obj.nextAction === 'conclude' || obj.nextAction === 'continue'
      ? obj.nextAction
      : 'continue';
  return {
    sufficient: obj.sufficient !== false,
    goalReached: obj.goalReached === true,
    observation:
      typeof obj.observation === 'string' && obj.observation.trim()
        ? obj.observation.trim()
        : 'Evaluatie voltooid.',
    nextAction,
    revisedGoal: typeof obj.revisedGoal === 'string' ? obj.revisedGoal.trim() : undefined,
  };
}
