import { useQueryClient } from '@tanstack/react-query';
import { useAetherMutation } from '@/lib/query/hooks';
import { toUserMessage } from '@/lib/api/errors';
import { invalidateAfterCommandChange } from '@/lib/data/invalidateAfterMutation';
import { notifyCommandExecuted } from '@/lib/data/commandEvents';
import { afterCommandExecuted } from '@/lib/data/sideEffects';
import { showCalmToast, showErrorToast } from '@/lib/toast';
import { t } from '@/lib/i18n';
import { commandsApi } from '@/features/commands/api';
import { trackBusinessEvent, trackMutationFailure } from '@/lib/observability/businessEvents';
import { withBusinessSpan } from '@/lib/observability/performanceSpans';
import { useCommandStream } from '@/lib/useCommandStream';
import type { CommandResult } from '@/types/command';

export interface UseCommandMutationsOptions {
  onExecuteSuccess?: (data: CommandResult) => void;
  onExecuteError?: (message: string) => void;
  onUndoSuccess?: () => void;
  onUndoError?: (message: string) => void;
}

export function useCommandMutations(options: UseCommandMutationsOptions = {}) {
  const queryClient = useQueryClient();
  const {
    steps: streamSteps,
    plan: streamPlan,
    plansByAgent: streamPlansByAgent,
    streaming,
    activeAgentKey,
    activeAgentKeys,
    handoffChain: streamHandoffChain,
    sharedMemory: streamSharedMemory,
    executionMode: streamExecutionMode,
    chainFrom: streamChainFrom,
    liveExplain,
    executingProactiveId,
    executeWithStream,
    executeProactiveWithStream,
    reset: resetStream,
    cancel: cancelStream,
  } = useCommandStream();

  const executeMutation = useAetherMutation({
    mutationFn: (command: string) =>
      withBusinessSpan('command.execute', { domain: 'commands' }, async () => {
        const streamed = await executeWithStream(command);
        if (streamed) return streamed;
        return commandsApi.execute(command);
      }),
    meta: { domain: 'commands', handled: true },
    showToastOnError: false,
    onSuccess: (data) => {
      trackBusinessEvent('command.executed', {
        intent: data.parsedIntent,
        commandId: data.commandId ?? null,
        success: data.success ?? true,
        confidence: data.confidence ?? null,
      });
      afterCommandExecuted(data);
      invalidateAfterCommandChange(queryClient);
      notifyCommandExecuted();
      options.onExecuteSuccess?.(data);
    },
    onError: (err) => {
      trackMutationFailure('commands', err);
      const msg = toUserMessage(err);
      options.onExecuteError?.(msg);
    },
  });

  const undoMutation = useAetherMutation({
    mutationFn: (commandId: string) => commandsApi.undo(commandId),
    meta: { domain: 'commands', handled: true },
    showToastOnError: false,
    onSuccess: () => {
      trackBusinessEvent('command.undo', { success: true });
      showCalmToast({ variant: 'success', title: t('command.undo.success') });
      invalidateAfterCommandChange(queryClient);
      notifyCommandExecuted();
      options.onUndoSuccess?.();
    },
    onError: (err) => {
      trackMutationFailure('commands', err);
      const msg = toUserMessage(err);
      options.onUndoError?.(msg);
      showErrorToast(msg);
    },
  });

  return {
    executeMutation,
    undoMutation,
    loading: executeMutation.isPending || undoMutation.isPending,
    streamSteps,
    streamPlan,
    streamPlansByAgent,
    streaming,
    activeAgentKey,
    activeAgentKeys,
    streamHandoffChain,
    streamSharedMemory,
    streamExecutionMode,
    streamChainFrom,
    streamLiveExplain: liveExplain,
    executingProactiveId,
    executeProactiveWithStream,
    resetStream,
    cancelStream,
  };
}
