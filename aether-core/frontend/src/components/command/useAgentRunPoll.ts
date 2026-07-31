import { useEffect, useState } from 'react';
import type { AgentRunResponse } from '@/types/command';
import type { CommandResult } from '@/lib/CommandContext';
import { commandsRepository } from '@/lib/data/repositories/commandsRepository';

export function useAgentRunPoll(result: CommandResult) {
  const [liveAgentRun, setLiveAgentRun] = useState<AgentRunResponse | null>(null);
  const brain = result.brain;

  useEffect(() => {
    const shouldPoll =
      brain?.runStatus === 'running' ||
      brain?.checkpoint ||
      brain?.runStatus === 'awaiting_approval';

    if (!result.commandId || !shouldPoll) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const run = await commandsRepository.agentRun(result.commandId!);
        if (cancelled) return;
        setLiveAgentRun(run);
        if (run.status === 'awaiting_approval' || run.status === 'running') {
          timer = setTimeout(poll, 4000);
        }
      } catch {
        // Polling is best-effort
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [result.commandId, brain?.checkpoint, brain?.runStatus]);

  const isCheckpoint = Boolean(
    liveAgentRun?.checkpoint ??
      brain?.checkpoint ??
      (liveAgentRun?.status === 'awaiting_approval' || brain?.runStatus === 'awaiting_approval'),
  );
  const awaitingApprovalId = liveAgentRun?.awaitingApprovalId ?? brain?.awaitingApprovalId;
  const agentTranscript = liveAgentRun?.transcript ?? brain?.transcript;

  return { liveAgentRun, isCheckpoint, awaitingApprovalId, agentTranscript };
}
