import { DEFAULT_BRAIN_AGENT_KEY } from '../../global-knowledge/constants';

const HANDOFF_ROUTES: Record<string, string> = {
  mail: DEFAULT_BRAIN_AGENT_KEY,
  supplier: DEFAULT_BRAIN_AGENT_KEY,
};

export function canHandoffReflection(sourceAgentKey: string, targetAgentKey?: string): boolean {
  const target = targetAgentKey ?? DEFAULT_BRAIN_AGENT_KEY;
  return HANDOFF_ROUTES[sourceAgentKey] === target;
}

export function listHandoffSourceKeys(): string[] {
  return Object.keys(HANDOFF_ROUTES);
}
