import type { SpecialistAgentDefinition } from './types';
import { isMultiAgentDelegationEnabled, getAllowedDelegationTargets } from './delegationConfig';

export class AgentRegistry {
  private agents = new Map<string, SpecialistAgentDefinition>();

  constructor(definitions: SpecialistAgentDefinition[] = []) {
    for (const def of definitions) {
      this.register(def);
    }
  }

  register(definition: SpecialistAgentDefinition): void {
    this.agents.set(definition.agentKey, definition);
  }

  get(agentKey: string): SpecialistAgentDefinition | undefined {
    return this.agents.get(agentKey);
  }

  list(): SpecialistAgentDefinition[] {
    return [...this.agents.values()];
  }

  resolve(intent: string, command?: string): SpecialistAgentDefinition | null {
    if (!isMultiAgentDelegationEnabled()) return null;

    const byIntent = this.resolveByIntent(intent);
    if (byIntent) return byIntent;

    if (command) {
      const keywordMatches = this.resolveKeywordMatches(command);
      if (keywordMatches.length === 1) return keywordMatches[0];
    }

    return null;
  }

  resolveByIntent(intent: string): SpecialistAgentDefinition | null {
    if (!isMultiAgentDelegationEnabled()) return null;
    const allowed = getAllowedDelegationTargets();
    for (const def of this.agents.values()) {
      if (!allowed.has(def.agentKey)) continue;
      if (def.supportedIntents.includes(intent)) return def;
    }
    return null;
  }

  resolveKeywordMatches(command: string): SpecialistAgentDefinition[] {
    if (!isMultiAgentDelegationEnabled()) return [];
    const allowed = getAllowedDelegationTargets();
    const matches: SpecialistAgentDefinition[] = [];
    for (const def of this.agents.values()) {
      if (!allowed.has(def.agentKey)) continue;
      if (def.keywordPatterns?.some((p) => p.test(command))) {
        matches.push(def);
      }
    }
    return matches;
  }

  resolveByKey(agentKey: string): SpecialistAgentDefinition | null {
    if (!isMultiAgentDelegationEnabled()) return null;
    const allowed = getAllowedDelegationTargets();
    if (!allowed.has(agentKey)) return null;
    return this.agents.get(agentKey) ?? null;
  }
}
