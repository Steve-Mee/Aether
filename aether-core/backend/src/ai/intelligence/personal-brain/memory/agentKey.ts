import { DEFAULT_BRAIN_AGENT_KEY } from '../../global-knowledge/constants';

export function resolveMemoryAgentKey(agentKey?: string): string {
  return agentKey?.trim() || DEFAULT_BRAIN_AGENT_KEY;
}

export { DEFAULT_BRAIN_AGENT_KEY };
