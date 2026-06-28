import { isMutatingIntent } from '../command-brain/BrainActionPolicyResolver';
import type { ExecutionMode } from './types';

export function classifyMultiAgentMode(
  agents: Array<{ agentKey: string; intent: string }>
): Extract<ExecutionMode, 'parallel' | 'sequential'> {
  const hasMutating = agents.some((a) => isMutatingIntent(a.intent));
  return hasMutating ? 'sequential' : 'parallel';
}
