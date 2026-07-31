import type { RiskClass } from '../../../ai/orchestrator/WorkflowEngine';
import { policyEngine } from '../../../ai/orchestrator/WorkflowEngine';
import type {
  AutonomyActionCategory,
  AgentAutonomyOverride,
} from '../../settings/autonomyTypes';
import type { MerchantSettings } from '../../settings/merchantSettingsTypes';
import type {
  AutonomyAssessInput,
  AutonomyAssessmentWithTrace,
  AutonomyTraceStep,
} from '../AutonomyPolicyService';

export interface AutonomyGuardContext {
  input: AutonomyAssessInput;
  settings: MerchantSettings;
  payload: Record<string, unknown>;
  now: Date;
  trace: AutonomyTraceStep[];
  category: AutonomyActionCategory | null;
  module: string;
  actionType: string;
  action: string;
  decision: ReturnType<typeof policyEngine.evaluate>;
  riskClass: RiskClass;
  catPolicy: {
    enabled: boolean;
    allowLowRiskAutoExecute: boolean;
    allowMediumRiskAutoExecute: boolean;
  } | null;
  agentOv: AgentAutonomyOverride | null;
  marginImpact: number;
  pct: number;
  effective: { allowLow: boolean; allowMedium: boolean };
}

export type AutonomyGuardStepResult =
  | { kind: 'continue' }
  | { kind: 'done'; assessment: AutonomyAssessmentWithTrace };

export interface AutonomyGuardStep {
  name: string;
  run: (ctx: AutonomyGuardContext) => AutonomyGuardStepResult;
}
