import type { AgentMessage } from '../../../../../ai/intelligence/command-brain/AgentTranscript';
import type { SpecialistExecuteResult } from '../../../../../ai/intelligence/multi-agent/types';

export function collectAgentTranscripts(
  results: Array<Pick<SpecialistExecuteResult, 'transcript'>>,
  agentKeys: string[]
): Record<string, AgentMessage[]> | undefined {
  const map: Record<string, AgentMessage[]> = {};
  results.forEach((r, i) => {
    if (r.transcript?.length) {
      map[agentKeys[i] ?? `agent-${i}`] = r.transcript;
    }
  });
  return Object.keys(map).length > 0 ? map : undefined;
}
