import type { SpecialistAgentDefinition } from '../types';
import { GLOBAL_ADVISORY_AGENT_KEY } from '../peer/FederatedPeerPort';

export const globalAdvisoryAgentDefinition: SpecialistAgentDefinition = {
  agentKey: GLOBAL_ADVISORY_AGENT_KEY,
  displayName: 'Global Advisory',
  rolePrompt:
    'You provide anonymized federated trend insights from the GlobalBrain. Never expose raw merchant data.',
  supportedIntents: ['GLOBAL_ADVISORY'],
  allowedTools: [],
  memoryNamespace: GLOBAL_ADVISORY_AGENT_KEY,
  canDelegateTo: [],
  keywordPatterns: [/\b(trend|benchmark|industry|sector|global)\b/i],
};
