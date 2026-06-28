import type {
  AutonomyActionCategory,
  AutonomyCustomRule,
  AutonomyRuleCondition,
} from '../settings/autonomyTypes';
import type { RiskClass } from '../../ai/orchestrator/WorkflowEngine';

export interface RuleEvaluationContext {
  marginImpactEuro: number;
  priceChangePct: number;
  category: AutonomyActionCategory | null;
  riskClass: RiskClass;
  agentKey?: string | null;
  now?: Date;
}

export interface MatchedAutonomyRule {
  rule: AutonomyCustomRule;
  outcome: AutonomyCustomRule['outcome'];
}

function compareCondition(
  cond: AutonomyRuleCondition,
  ctx: RuleEvaluationContext,
): boolean {
  const { field, operator, value } = cond;
  let actual: string | number;

  switch (field) {
    case 'marginImpactEuro':
      actual = ctx.marginImpactEuro;
      break;
    case 'priceChangePct':
      actual = ctx.priceChangePct;
      break;
    case 'category':
      actual = ctx.category ?? '';
      break;
    case 'riskClass':
      actual = ctx.riskClass;
      break;
    case 'agentKey':
      actual = ctx.agentKey ?? '';
      break;
    case 'dayOfWeek':
      actual = (ctx.now ?? new Date()).getDay();
      break;
    default:
      return false;
  }

  if (operator === 'in' && Array.isArray(value)) {
    return value.map(String).includes(String(actual));
  }

  const numActual = Number(actual);
  const numValue = Number(value);
  if (operator === 'gt') return numActual > numValue;
  if (operator === 'gte') return numActual >= numValue;
  if (operator === 'lt') return numActual < numValue;
  if (operator === 'lte') return numActual <= numValue;
  if (operator === 'eq') return String(actual) === String(value);
  return false;
}

export function matchAutonomyRules(
  rules: AutonomyCustomRule[],
  ctx: RuleEvaluationContext,
): MatchedAutonomyRule | null {
  const enabled = rules.filter((r) => r.enabled && r.conditions.length > 0);
  const sorted = [...enabled].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const rule of sorted) {
    const allMatch = rule.conditions.every((c) => compareCondition(c, ctx));
    if (allMatch) {
      return { rule, outcome: rule.outcome };
    }
  }
  return null;
}
