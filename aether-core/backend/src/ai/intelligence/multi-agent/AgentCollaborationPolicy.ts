import type { AgentRegistry } from './AgentRegistry';
import { classifyMultiAgentMode } from './ExecutionModeClassifier';
import { isMutatingIntent } from '../command-brain/BrainActionPolicyResolver';
import type { AutonomyPrefs } from '../../../shared/settings/autonomyTypes';
import { getAgentPriority } from '../../../shared/settings/autonomyTypes';
import type { CollaborationChain, CollaborationChainStep, ExecutionPlan } from './types';
import { DEFAULT_RULES } from './collaborationRules';
import {
  MUTATING_COMMAND_PATTERN,
  SUPPLIER_KEYWORD_PATTERN,
} from './collaborationPatterns';

export type { CollaborationChain, CollaborationChainStep };

function matchesKeywordAgents(
  command: string,
  registry: AgentRegistry,
  requiredAgentKeys: string[]
): boolean {
  const matches = registry.resolveKeywordMatches(command);
  const matchedKeys = new Set(matches.map((m) => m.agentKey));
  return requiredAgentKeys.every((key) => matchedKeys.has(key));
}

export function resolveMultiAgentKeywords(command: string, registry: AgentRegistry): string[] {
  return registry.resolveKeywordMatches(command).map((m) => m.agentKey);
}

export function sortAgentsByAutonomyPriority(
  agentKeys: string[],
  autonomyPrefs: AutonomyPrefs,
): string[] {
  return [...agentKeys].sort(
    (a, b) => getAgentPriority(autonomyPrefs, b) - getAgentPriority(autonomyPrefs, a),
  );
}

export function resolvePrimaryAgentByPriority(
  agentKeys: string[],
  autonomyPrefs: AutonomyPrefs,
): string | null {
  if (agentKeys.length === 0) return null;
  const sorted = sortAgentsByAutonomyPriority(agentKeys, autonomyPrefs);
  return sorted[0] ?? null;
}

export function resolveCollaborationChain(
  command: string,
  intent: string,
  registry: AgentRegistry,
  primaryAgentKey?: string
): CollaborationChain | null {
  for (const rule of DEFAULT_RULES) {
    const { trigger } = rule;

    if (trigger.intents && !trigger.intents.includes(intent)) continue;

    if (trigger.excludeIntents?.includes(intent)) continue;

    if (rule.mode === 'parallel') {
      if (isMutatingIntent(intent)) continue;
      if (MUTATING_COMMAND_PATTERN.test(command)) continue;
      if (classifyMultiAgentMode(rule.chain) === 'sequential') continue;
    }

    if (trigger.commandPattern && !trigger.commandPattern.test(command)) continue;

    if (
      trigger.requireKeywordAgents &&
      !matchesKeywordAgents(command, registry, trigger.requireKeywordAgents)
    ) {
      continue;
    }

    if (rule.mode === 'prepend' && primaryAgentKey) {
      const prependSteps = rule.chain.filter((s) => s.agentKey !== primaryAgentKey);
      if (prependSteps.length === 0) continue;
      return {
        ruleId: rule.id,
        mode: 'prepend',
        steps: prependSteps.map((s) => ({
          ...s,
          command: buildChainCommand(s, command, primaryAgentKey),
        })),
        primaryAgentKey,
      };
    }

    if (rule.mode === 'sequential' || rule.mode === 'parallel') {
      return {
        ruleId: rule.id,
        mode: rule.mode,
        steps: rule.chain.map((s) => ({
          ...s,
          command: buildChainCommand(s, command),
        })),
      };
    }
  }

  return null;
}

function buildChainCommand(
  step: CollaborationChainStep,
  originalCommand: string,
  primaryAgentKey?: string
): string {
  if (step.command) return step.command;
  if (primaryAgentKey) {
    return `${step.intent} context voor ${primaryAgentKey}: ${originalCommand}`;
  }
  return originalCommand;
}

export function detectMultiDomainPlan(
  command: string,
  intent: string,
  registry: AgentRegistry,
  primaryAgentKey?: string
): ExecutionPlan | null {
  const keywordAgents = resolveMultiAgentKeywords(command, registry);
  if (keywordAgents.length < 2) return null;

  let steps = keywordAgents.map((key) => {
    const def = registry.resolveByKey(key);
    const stepIntent =
      key === primaryAgentKey ? intent : (def?.supportedIntents[0] ?? intent);
    return { agentKey: key, intent: stepIntent, command };
  });

  if (primaryAgentKey) {
    steps = [
      ...steps.filter((s) => s.agentKey === primaryAgentKey),
      ...steps.filter((s) => s.agentKey !== primaryAgentKey),
    ];
  }

  const mode = classifyMultiAgentMode(steps);
  return {
    mode,
    agents: steps,
    routingSource: 'keyword',
    routingReason: mode === 'parallel' ? 'multi-domain parallel' : 'multi-domain match',
  };
}

export function collaborationChainToExecutionPlan(chain: CollaborationChain): ExecutionPlan {
  if (chain.mode === 'sequential' || chain.mode === 'parallel') {
    const agents = chain.steps.map((s) => ({
      agentKey: s.agentKey,
      intent: s.intent,
      command: s.command,
    }));
    const mode =
      chain.mode === 'parallel' ? classifyMultiAgentMode(agents) : chain.mode;
    return { mode, agents };
  }

  const primaryKey = chain.primaryAgentKey ?? chain.steps[chain.steps.length - 1]?.agentKey;
  const primaryIntent =
    chain.steps.find((s) => s.agentKey === primaryKey)?.intent ?? chain.steps[0]?.intent ?? 'UNKNOWN';

  return {
    mode: 'single',
    agents: primaryKey
      ? [{ agentKey: primaryKey, intent: primaryIntent }]
      : [],
    collaborationChain: chain,
  };
}

export function needsSupplierIntel(command: string, intent: string): boolean {
  if (intent !== 'PRICE_UPDATE' && intent !== 'PRICING_OPTIMIZE') return false;
  return SUPPLIER_KEYWORD_PATTERN.test(command);
}

export function resolvePrependChainForPrimary(
  command: string,
  intent: string,
  primaryDef: import('./types').SpecialistAgentDefinition,
  registry: AgentRegistry
): CollaborationChain | null {
  return resolveCollaborationChain(command, intent, registry, primaryDef.agentKey);
}
