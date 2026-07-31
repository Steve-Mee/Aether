import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, '../src/lib/localIntentMatcher.ts');
const outPath = path.join(__dirname, '../src/lib/intents/demoResponses.ts');
const src = fs.readFileSync(srcPath, 'utf8');

const start = src.indexOf('export function getLoadingPhases');
const end = src.length;
const body = src.slice(start, end);

const header = `import type { CommandResult } from '@/types/command';
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

`;

let cleaned = body;
const dupStart = cleaned.indexOf('\nfunction demoSpecialistBrain');
if (dupStart !== -1) {
  const dupEnd = cleaned.indexOf('\n}\n\nexport function buildDemoResponse', dupStart);
  cleaned = cleaned.slice(0, dupStart) + cleaned.slice(dupEnd + 2);
}

fs.writeFileSync(outPath, header + cleaned);
console.log('demoResponses lines:', (header + cleaned).split('\n').length);
