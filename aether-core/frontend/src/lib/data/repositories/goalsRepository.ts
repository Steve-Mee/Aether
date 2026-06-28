import { getDataAdapter } from '../createDataAdapter';
import type { CreateGoalPayload, UpdateGoalPayload } from '@/types/goals';

export const goalsRepository = {
  list: (includeCompleted?: boolean) => getDataAdapter().fetchGoals(includeCompleted),
  get: (id: string) => getDataAdapter().fetchGoal(id),
  create: (payload: CreateGoalPayload) => getDataAdapter().createGoal(payload),
  update: (id: string, payload: UpdateGoalPayload) => getDataAdapter().updateGoal(id, payload),
  delete: (id: string) => getDataAdapter().deleteGoal(id),
  refresh: (id: string) => getDataAdapter().refreshGoal(id),
};
