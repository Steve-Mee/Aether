import { isMutatingIntent } from '../command-brain/BrainActionPolicyResolver';
import type { AgentRegistry } from './AgentRegistry';
import { isNestedPlansEnabled } from './parallelConfig';
import type { ExecutionMode, ExecutionPlan, PlanAgent, PlanNode } from './types';

export const DEFAULT_MAX_PLAN_DEPTH = 3;
export const DEFAULT_MAX_PLAN_AGENTS = 5;

export function flattenPlan(root: PlanNode): PlanAgent[] {
  switch (root.kind) {
    case 'agent':
      return [{ agentKey: root.agentKey, intent: root.intent, command: root.command }];
    case 'group':
      return root.children.flatMap((child) => flattenPlan(child));
    case 'supervisor':
      if (root.subPlan) {
        return [{ agentKey: root.agentKey, intent: root.intent, command: root.command }, ...flattenPlan(root.subPlan)];
      }
      return [{ agentKey: root.agentKey, intent: root.intent, command: root.command }];
    default:
      return [];
  }
}

export function countPlanAgents(root: PlanNode): number {
  return flattenPlan(root).length;
}

export function planDepth(root: PlanNode): number {
  switch (root.kind) {
    case 'agent':
      return 1;
    case 'supervisor':
      return root.subPlan ? 1 + planDepth(root.subPlan) : 1;
    case 'group':
      if (root.children.length === 0) return 1;
      return 1 + Math.max(...root.children.map(planDepth));
    default:
      return 1;
  }
}

export function validatePlanNode(
  root: PlanNode,
  maxDepth = DEFAULT_MAX_PLAN_DEPTH,
  maxAgents = DEFAULT_MAX_PLAN_AGENTS
): void {
  const depth = planDepth(root);
  const agents = countPlanAgents(root);
  if (depth > maxDepth) {
    throw new Error(`Plan depth ${depth} exceeds max ${maxDepth}`);
  }
  if (agents > maxAgents) {
    throw new Error(`Plan agent count ${agents} exceeds max ${maxAgents}`);
  }
}

export function buildGroupNode(
  mode: 'sequential' | 'parallel',
  children: PlanNode[]
): PlanNode {
  return { kind: 'group', mode, children };
}

export function buildAgentNode(
  agentKey: string,
  intent: string,
  command?: string
): PlanNode {
  return { kind: 'agent', agentKey, intent, command };
}

export function buildCompoundPlanNode(
  subGoals: Array<{ intent: string; command: string }>,
  registry: AgentRegistry,
  connector: 'sequential' | 'parallel' = 'sequential'
): PlanNode | null {
  const agentNodes: PlanNode[] = [];
  for (const step of subGoals) {
    const def = registry.resolveByIntent(step.intent);
    if (!def) continue;
    agentNodes.push(buildAgentNode(def.agentKey, step.intent, step.command));
  }
  if (agentNodes.length === 0) return null;
  if (agentNodes.length === 1) return agentNodes[0]!;
  return buildGroupNode(connector, agentNodes);
}

export function compoundToExecutionPlan(
  subGoals: Array<{ intent: string; command: string }>,
  registry: AgentRegistry,
  connector: 'sequential' | 'parallel' = 'sequential'
): ExecutionPlan {
  const hasMutating = subGoals.some((s) => isMutatingIntent(s.intent));
  const mode: ExecutionMode =
    connector === 'parallel' && !hasMutating ? 'parallel' : 'sequential';

  if (isNestedPlansEnabled()) {
    const root = buildCompoundPlanNode(subGoals, registry, mode === 'parallel' ? 'parallel' : 'sequential');
    if (!root) return { mode: 'single', agents: [] };
    validatePlanNode(root);
    const agents = flattenPlan(root);
    return {
      mode: agents.length > 1 ? mode : 'single',
      agents,
      root,
      planDepth: planDepth(root),
      routingSource: 'intent',
      routingReason: 'compound:nested',
    };
  }

  const agents: PlanAgent[] = [];
  for (const step of subGoals) {
    const def = registry.resolveByIntent(step.intent);
    if (def) {
      agents.push({ agentKey: def.agentKey, intent: step.intent, command: step.command });
    }
  }

  return {
    mode: agents.length > 1 ? mode : 'single',
    agents,
    routingSource: 'intent',
    routingReason: 'compound:flat',
  };
}

/** Build (A ∥ B) → C topology. */
export function buildParallelThenSequential(
  parallelAgents: Array<{ agentKey: string; intent: string; command?: string }>,
  thenAgent: { agentKey: string; intent: string; command?: string }
): PlanNode {
  return buildGroupNode('sequential', [
    buildGroupNode('parallel', parallelAgents.map((a) => buildAgentNode(a.agentKey, a.intent, a.command))),
    buildAgentNode(thenAgent.agentKey, thenAgent.intent, thenAgent.command),
  ]);
}

export function executionPlanFromRoot(
  root: PlanNode,
  routingSource: ExecutionPlan['routingSource'] = 'keyword',
  routingReason?: string
): ExecutionPlan {
  validatePlanNode(root);
  const agents = flattenPlan(root);
  const topMode =
    root.kind === 'group' && root.mode === 'parallel' && agents.length > 1
      ? 'parallel'
      : agents.length > 1
        ? 'sequential'
        : 'single';
  return {
    mode: topMode,
    agents,
    root,
    planDepth: planDepth(root),
    routingSource,
    routingReason,
  };
}
