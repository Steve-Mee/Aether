import type { ActionExecutionMode } from '../actionAutonomy';
import type { CommandResult } from '@/types/command';

export type DemoIntentId =
  | 'PRICING_OPTIMIZATION'
  | 'PRODUCT_PRICE_PROPOSAL'
  | 'SUPPLIER_CHECK'
  | 'HIGH_RISK_APPROVALS'
  | 'INSIGHTS_OVERVIEW'
  | 'MARGIN_INSIGHT'
  | 'AUTONOMOUS_ACTION'
  | 'BUSINESS_SUMMARY'
  | 'RETURN_RISK_ORDERS'
  | 'COMPOUND_WORKFLOW'
  | 'UNKNOWN';

export type LinkedInsightId =
  | 'pricing'
  | 'supplier'
  | 'approvals'
  | 'margins'
  | 'autonomous'
  | 'summary'
  | 'returns'
  | null;

export type SuggestionCategory =
  | 'prijs'
  | 'leverancier'
  | 'goedkeuringen'
  | 'inzicht'
  | 'autonomie'
  | 'overzicht';

export interface DemoIntentMatch {
  id: DemoIntentId;
  label: string;
  confidence: number;
}

export interface DemoSuggestion {
  id: string;
  label: string;
  command: string;
  intentId: DemoIntentId;
  category: SuggestionCategory;
  hint?: string;
  executionMode?: ActionExecutionMode;
  source?: 'static' | 'dashboard' | 'today' | 'proactive';
  priority?: number;
  badge?: string;
}

export interface CompoundStepResult {
  label: string;
  intentId: DemoIntentId;
  summary: string;
  done: boolean;
}

export type DemoResponseVariant = 'default' | 'summary';

export interface DemoSecondaryMetric {
  label: string;
  value: string;
}

export interface DemoExplainStep {
  at: string;
  label: string;
  detail?: string;
}

export interface DemoCommandResponse extends CommandResult {
  intentId: DemoIntentId;
  summary: string;
  highlights: string[];
  metricLabel?: string;
  metricValue?: string;
  preparedHeadline: string;
  impactLabel?: string;
  impactValue?: string;
  linkedInsightId: LinkedInsightId;
  executionConfirmation?: string;
  executeLabel?: string;
  responseVariant?: DemoResponseVariant;
  secondaryMetrics?: DemoSecondaryMetric[];
  gateTitle?: string;
  gateSummary?: string;
  gateImpact?: string;
  gateRiskDetail?: string;
  undoable?: boolean;
  undoWindowLabel?: string;
  compoundSteps?: CompoundStepResult[];
  postExecuteActions?: ('undo' | 'adjust' | 'explain')[];
}
