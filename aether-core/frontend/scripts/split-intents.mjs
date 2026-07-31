import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, '../src/lib/localIntentMatcher.ts');
const outDir = path.join(__dirname, '../src/lib/intents');
const src = fs.readFileSync(srcPath, 'utf8');

fs.mkdirSync(outDir, { recursive: true });

function slice(startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  const end = endMarker ? src.indexOf(endMarker, start) : src.length;
  if (start === -1) throw new Error(`Missing start: ${startMarker}`);
  if (endMarker && end === -1) throw new Error(`Missing end: ${endMarker}`);
  return src.slice(start, end);
}

// types.ts: from line 1 through DemoCommandResponse interface (before DEMO_SUGGESTIONS)
const typesEnd = src.indexOf('export const DEMO_SUGGESTIONS');
const typesBlock = src.slice(0, typesEnd).trimEnd();

fs.writeFileSync(
  path.join(outDir, 'types.ts'),
  typesBlock.replace(
    "import { isCompoundCommand, parseCompoundCommand } from './compoundCommandParser';",
    '',
  ) + '\n',
);

// demoSuggestions.ts
const suggestionsBlock = slice('export const DEMO_SUGGESTIONS', 'const CATEGORY_LABELS');
fs.writeFileSync(
  path.join(outDir, 'demoSuggestions.ts'),
  `import type { DemoIntentId, DemoSuggestion, SuggestionCategory } from './types';\n\n${suggestionsBlock}`,
);

// metadata.ts
const metadataBlock = slice('const CATEGORY_LABELS', 'interface IntentRule');
fs.writeFileSync(
  path.join(outDir, 'metadata.ts'),
  `import type { DemoExplainStep, DemoIntentId, SuggestionCategory } from './types';\n\n${metadataBlock}`,
);

// intentRules.ts
const rulesBlock = slice('interface IntentRule', 'export function detectIntent');
const detectBlock = slice('export function detectIntent', 'export function shouldShowIntentPill');
const shouldShowBlock = slice(
  'export function shouldShowIntentPill',
  'function scoreSuggestion',
);
fs.writeFileSync(
  path.join(outDir, 'intentRules.ts'),
  `import type { DemoIntentMatch, DemoIntentId } from './types';
import { isCompoundCommand } from '../compoundCommandParser';
import { INTENT_LABELS, INTENT_SPECIFICITY } from './metadata';
import { INTENT_RULES, scoreRule, MIN_SCORE_THRESHOLD, normalize, specificityRank } from './intentRuleTable';

${detectBlock.trim()}

${shouldShowBlock.trim()}
`,
);

// intentRuleTable.ts - the table and scoring helpers
const ruleTableBlock = slice('interface IntentRule', 'const MIN_SCORE_THRESHOLD');
const scoringBlock = slice('const MIN_SCORE_THRESHOLD', 'export function detectIntent');
fs.writeFileSync(
  path.join(outDir, 'intentRuleTable.ts'),
  `import type { DemoIntentId } from './types';

${ruleTableBlock.trim()}

${scoringBlock.trim()}
`,
);

// suggestionRanking.ts
const rankingBlock = slice('function scoreSuggestion', 'export function buildCompoundDemoResponse');
fs.writeFileSync(
  path.join(outDir, 'suggestionRanking.ts'),
  `import type { DemoIntentMatch, DemoIntentId, DemoSuggestion, SuggestionCategory } from './types';
import {
  buildContextualSuggestions,
  type ContextualSuggestion,
  type SuggestionBuildInput,
} from '../commandSuggestionContext';
import { DEMO_SUGGESTIONS, IDLE_SUGGESTION_IDS } from './demoSuggestions';
import { CATEGORY_LABELS } from './metadata';
import { detectIntent } from './intentRules';

export type { SuggestionBuildInput };

${rankingBlock.trim()}
`,
);

// demoResponses.ts
const responsesBlock = slice('export function buildCompoundDemoResponse', 'export function intentLabel');
const helpersBlock = slice('export function intentLabel', src.length);
fs.writeFileSync(
  path.join(outDir, 'demoResponses.ts'),
  `import type { CommandResult } from '@/types/command';
import type { DemoCommandResponse, DemoExplainStep, DemoIntentId, LinkedInsightId } from './types';
import type { SuggestionBuildInput } from '../commandSuggestionContext';
import { isCompoundCommand, parseCompoundCommand } from '../compoundCommandParser';
import { EXPLAIN_TIMELINES, INTENT_LABELS, LOADING_PHASES } from './metadata';
import { detectIntent } from './intentRules';
import { getContextualSuggestionsForUnknown } from './suggestionRanking';

function demoSpecialistBrain(intentId: DemoIntentId): CommandResult['brain'] | undefined {
  const agentMap: Partial<Record<DemoIntentId, string>> = {
    PRICING_OPTIMIZATION: 'pricing',
    PRODUCT_PRICE_PROPOSAL: 'pricing',
    MARGIN_INSIGHT: 'pricing',
    SUPPLIER_CHECK: 'supplier',
  };
  const agentKey = agentMap[intentId];
  if (!agentKey) return undefined;
  return {
    contextSnippets: [],
    specialist: { agentKey, delegatedFrom: 'admin', routingSource: 'intent' },
  };
}

${responsesBlock.trim()}

${helpersBlock.trim()}
`,
);

// Fix intentRules.ts - it shouldn't duplicate detectIntent internals from intentRuleTable
// Rewrite intentRules to import from intentRuleTable
const intentRulesContent = `import type { DemoIntentMatch } from './types';
import { isCompoundCommand } from '../compoundCommandParser';
import { INTENT_LABELS } from './metadata';
import {
  INTENT_RULES,
  MIN_SCORE_THRESHOLD,
  normalize,
  scoreRule,
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
`;
fs.writeFileSync(path.join(outDir, 'intentRules.ts'), intentRulesContent);

// Fix intentRuleTable - export functions that were internal
const ruleTableContent = fs.readFileSync(path.join(outDir, 'intentRuleTable.ts'), 'utf8');
const fixedRuleTable = ruleTableContent
  .replace('function normalize(text: string): string {', 'export function normalize(text: string): string {')
  .replace('function scoreRule(rule: IntentRule, text: string): number {', 'export function scoreRule(rule: IntentRule, text: string): number {')
  .replace('function specificityRank(id: DemoIntentId): number {', 'export function specificityRank(id: DemoIntentId): number {')
  .replace('const MIN_SCORE_THRESHOLD = 2;', 'export const MIN_SCORE_THRESHOLD = 2;')
  .replace('const INTENT_RULES: IntentRule[] = [', 'export const INTENT_RULES: IntentRule[] = [')
  .replace('interface IntentRule {', 'export interface IntentRule {');
fs.writeFileSync(path.join(outDir, 'intentRuleTable.ts'), fixedRuleTable);

// Fix types.ts - remove unused imports and export SuggestionBuildInput from suggestionRanking
const typesContent = fs.readFileSync(path.join(outDir, 'types.ts'), 'utf8');
const fixedTypes = typesContent
  .replace("import { isCompoundCommand, parseCompoundCommand } from './compoundCommandParser';", '')
  .replace("export type { SuggestionBuildInput };", '')
  .replace(
    "import {\n  buildContextualSuggestions,\n  type ContextualSuggestion,\n  type SuggestionBuildInput,\n} from './commandSuggestionContext';",
    "import type { CommandResult } from '@/types/command';\nimport type { ActionExecutionMode } from '../actionAutonomy';",
  );
fs.writeFileSync(path.join(outDir, 'types.ts'), fixedTypes);

// Fix demoResponses - remove duplicate demoSpecialistBrain if script included it from source
// The source had demoSpecialistBrain before buildDemoResponse - our template adds it explicitly

// localIntentMatcher.ts thin re-export
const matcherReexport = `export type {
  DemoIntentId,
  LinkedInsightId,
  SuggestionCategory,
  DemoIntentMatch,
  DemoSuggestion,
  CompoundStepResult,
  DemoResponseVariant,
  DemoSecondaryMetric,
  DemoCommandResponse,
  DemoExplainStep,
} from './intents/types';
export type { SuggestionBuildInput } from './intents/suggestionRanking';

export { DEMO_SUGGESTIONS, IDLE_SUGGESTION_IDS } from './intents/demoSuggestions';
export { detectIntent, shouldShowIntentPill } from './intents/intentRules';
export {
  mergeAndRankSuggestions,
  filterSuggestions,
  getContextualSuggestionsForUnknown,
  getIdleSuggestions,
  groupSuggestionsByCategory,
} from './intents/suggestionRanking';
export {
  getLoadingPhases,
  getCompoundStepLoadingPhases,
  buildCompoundDemoResponse,
  getExplainTimeline,
  buildDemoResponse,
  intentLabel,
  intentToLinkedInsight,
} from './intents/demoResponses';
`;

fs.writeFileSync(srcPath, matcherReexport);
console.log('Intent split complete');
