import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsRepository } from '@/lib/data/repositories/goalsRepository';
import { queryKeys } from '@/lib/query/keys';
import type { CreateGoalPayload, UpdateGoalPayload } from '@/types/goals';

export function useGoals(includeCompleted = false) {
  return useQuery({
    queryKey: queryKeys.goals(includeCompleted),
    queryFn: () => goalsRepository.list(includeCompleted),
    select: (data) => data.goals,
  });
}

export function useGoalMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['goals'] });
  };

  const create = useMutation({
    mutationFn: (payload: CreateGoalPayload) => goalsRepository.create(payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGoalPayload }) =>
      goalsRepository.update(id, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => goalsRepository.delete(id),
    onSuccess: invalidate,
  });

  const refresh = useMutation({
    mutationFn: (id: string) => goalsRepository.refresh(id),
    onSuccess: invalidate,
  });

  return { create, update, remove, refresh };
}
