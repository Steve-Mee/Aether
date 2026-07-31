import type { AgentTranscript } from '../AgentTranscript';
import type { AgentStreamCallback } from '../AgentStreamEvents';
import type { BrainToolTraceEntry, ToolProposal } from '../../personal-brain/tools/types';
import type { AgentPlan } from '../types/AgentPlan';
import type { AgentLoopRunInput } from '../AgentLoopTypes';

export const MAX_AGENT_STEPS = 5;
export const MAX_TOTAL_STEPS = 10;

export const PLAN_FOLLOW_INSTRUCTION =
  'Volg het plan. Na elke tool: evalueer of het doel bereikt is of ga naar de volgende stap. Bij falen: probeer alternatief of geef duidelijke foutmelding.';

export interface LoopContext {
  input: AgentLoopRunInput;
  transcript: AgentTranscript;
  toolTrace: BrainToolTraceEntry[];
  pendingActions: ToolProposal[];
  onEvent?: AgentStreamCallback;
  agentRunId?: string;
  startStep: number;
  get totalSteps(): number;
  incTotalSteps: () => void;
  plan: AgentPlan | null;
  currentPlanStep: number;
  replanUsed: boolean;
  failedPlanSteps: Array<{ label: string; error?: string }>;
  reflections: string[];
  planRevisions: number;
}
