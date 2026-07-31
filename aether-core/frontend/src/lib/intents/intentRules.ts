import type { DemoIntentMatch } from './types';
import { isCompoundCommand } from '../compoundCommandParser';
import { INTENT_LABELS } from './metadata';
import {
  INTENT_RULES,
  scoreRule,
  MIN_SCORE_THRESHOLD,
  normalize,
  specificityRank,
} from './intentRuleTable';

export function detectIntent(input: string): DemoIntentMatch {
  const t = normalize(input);
  if (!t) {
    return { id: 'UNKNOWN', label: INTENT_LABELS.UNKNOWN, confidence: 0 };
  }
  if (isCompoundCommand(input)) {
    return {
      id: 'COMPOUND_WORKFLOW',
      label: INTENT_LABELS.COMPOUND_WORKFLOW,
      confidence: 0.91,
    };
  }
  const scored = INTENT_RULES.map((rule) => ({
    rule,
    score: scoreRule(rule, t),
  })).filter(({ score }) => score >= MIN_SCORE_THRESHOLD);
  if (scored.length === 0) {
    return { id: 'UNKNOWN', label: INTENT_LABELS.UNKNOWN, confidence: 0.55 };
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return specificityRank(a.rule.id) - specificityRank(b.rule.id);
  });
  const best = scored[0]!;
  const confidence = Math.min(0.97, best.rule.base + (best.score - MIN_SCORE_THRESHOLD) * 0.02);
  return {
    id: best.rule.id,
    label: INTENT_LABELS[best.rule.id],
    confidence,
  };
}

export function shouldShowIntentPill(match: DemoIntentMatch): boolean {
  return match.id !== 'UNKNOWN' && match.confidence >= 0.75;
}
