import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface PlanSubtasksInput {
  goal: string;
  constraints?: string;
  maxSteps?: number;
}

/**
 * Decompose a merchant goal into ordered specialist subtasks for the Workflow Supervisor.
 * Heuristic planner (no LLM) — deterministic and testable; LLM synthesis stays in the agent loop.
 */
export function planGoalSubtasksTool(): BrainToolExecutor {
  return {
    definition: {
      name: 'planGoalSubtasks',
      description:
        'Break a compound merchant goal into ordered specialist subtasks with agent keys and intents',
      parameters: {
        goal: { type: 'string', required: true, description: 'Merchant goal or compound request' },
        constraints: {
          type: 'string',
          required: false,
          description: 'Optional constraints (budget, no price cuts, etc.)',
        },
        maxSteps: { type: 'number', required: false, description: 'Max subtasks (default 5)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'orchestration',
    },
    validate(input) {
      if (!String(input.goal ?? '').trim()) return { ok: false, error: 'goal is required' };
      return { ok: true };
    },
    async executeRead(_ctx, input) {
      const goal = String(input.goal).toLowerCase();
      const constraints = String(input.constraints ?? '');
      const maxSteps = Math.min(Number(input.maxSteps ?? 5), 8);

      const subtasks: Array<{
        step: number;
        agentKey: string;
        intent: string;
        objective: string;
      }> = [];

      const push = (agentKey: string, intent: string, objective: string) => {
        if (subtasks.length >= maxSteps) return;
        subtasks.push({ step: subtasks.length + 1, agentKey, intent, objective });
      };

      if (/\b(retour|return|kwaliteit|quality|refund)\b/i.test(goal)) {
        push('returns', 'RETURNS_ANALYSIS', 'Analyseer retourpatronen');
        push('supplier', 'SUPPLIER_MONITOR', 'Check leverancierskwaliteit');
      }
      if (/\b(promotie|marketing|campaign|bundle|korting)\b/i.test(goal)) {
        push('promotion', 'MARKETING_OPPORTUNITY', 'Detecteer marketingkansen');
        push('pricing', 'PRICING_OPTIMIZE', 'Toets marge-impact van promo');
      }
      if (/\b(voorraad|stock|inventory|restock)\b/i.test(goal)) {
        push('inventory', 'INVENTORY_STATUS', 'Inventariseer voorraadstatus');
      }
      if (/\b(prijs|price|marge|margin)\b/i.test(goal)) {
        push('pricing', 'PRICING_OPTIMIZE', 'Optimaliseer prijzen binnen doelen');
      }
      if (/\b(leverancier|supplier|inkoop)\b/i.test(goal)) {
        push('supplier', 'SUPPLIER_PRICE_INTEL', 'Verzamel leveranciersprijsintel');
      }
      if (/\b(mail|email|inbox)\b/i.test(goal)) {
        push('mail', 'EMAIL_SUMMARY', 'Vat inbox samen en escaleer kritiek');
      }
      if (/\b(forecast|demand|vraag)\b/i.test(goal)) {
        push('forecast', 'FORECAST_SUMMARY', 'Vraagvoorspelling samenvatten');
      }

      if (subtasks.length === 0) {
        push('customer', 'CUSTOMER_ORDER_TRENDS', 'Verzamel vraag/order signalen');
        push('inventory', 'INVENTORY_STATUS', 'Check operationele voorraad');
        push('pricing', 'LOW_MARGIN_REPORT', 'Identificeer marge-risico');
      }

      const highImpact =
        /\b(prijs\s*verlaag|autonoom|zonder\s*goedkeuring|bulk|alle\s*producten)\b/i.test(goal) ||
        /\b(>?\s*15\s*%|meer\s*dan\s*15)\b/i.test(constraints);

      return {
        success: true,
        goal: String(input.goal),
        constraints: constraints || null,
        subtasks,
        requiresHitl: highImpact,
        hitlReason: highImpact
          ? 'High-impact plan — merchant approval required before autonomous execution'
          : null,
        message: `Plan met ${subtasks.length} substappen${highImpact ? ' (HITL vereist)' : ''}`,
      };
    },
  };
}

export function synthesizeAgentResultsTool(): BrainToolExecutor {
  return {
    definition: {
      name: 'synthesizeAgentResults',
      description: 'Combine specialist agent results into a coherent merchant-facing plan summary',
      parameters: {
        results: {
          type: 'array',
          required: true,
          description: 'Array of { agentKey, summary } objects',
        },
        goal: { type: 'string', required: false, description: 'Original goal for framing' },
      },
      risk: 'low',
      kind: 'read',
      module: 'orchestration',
    },
    validate(input) {
      if (!Array.isArray(input.results)) return { ok: false, error: 'results must be an array' };
      return { ok: true };
    },
    async executeRead(_ctx, input) {
      const results = (input.results as Array<Record<string, unknown>>).map((r) => ({
        agentKey: String(r.agentKey ?? 'unknown'),
        summary: String(r.summary ?? ''),
      }));
      const goal = String(input.goal ?? 'merchant goal');
      const lines = results
        .filter((r) => r.summary.trim())
        .map((r) => `- [${r.agentKey}] ${r.summary}`);
      return {
        success: true,
        goal,
        coherentPlan: [
          `Plan voor: ${goal}`,
          ...lines,
          'Volgende stap: merchant bevestigt prioriteit of HITL-items.',
        ].join('\n'),
        agentCount: results.length,
      };
    },
  };
}

export function requestHitlGateTool(): BrainToolExecutor {
  return {
    definition: {
      name: 'requestHitlGate',
      description:
        'Request human-in-the-loop approval before executing a high-impact multi-agent plan',
      parameters: {
        planSummary: { type: 'string', required: true, description: 'Plan summary for merchant' },
        risk: {
          type: 'string',
          required: false,
          description: 'Risk class: low | medium | high (default high)',
        },
        reason: { type: 'string', required: false, description: 'Why HITL is required' },
      },
      risk: 'high',
      kind: 'propose',
      module: 'orchestration',
    },
    validate(input) {
      if (!String(input.planSummary ?? '').trim()) {
        return { ok: false, error: 'planSummary is required' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'requestHitlGate is propose-only' };
    },
    async buildProposal(_ctx, input) {
      const assessment = classifyBrainAction('requestHitlGate', input);
      return {
        tool: 'requestHitlGate',
        summary: `HITL-gate: ${String(input.planSummary).slice(0, 120)}`,
        risk: 'high',
        requiresApproval: true,
        expectedImpact: 'Geen autonome uitvoering tot merchant goedkeurt',
        confidence: 0.9,
        rationale: String(input.reason ?? assessment.rationale ?? 'High-impact multi-agent plan'),
        payload: {
          planSummary: String(input.planSummary),
          risk: String(input.risk ?? 'high'),
          reason: String(input.reason ?? 'Large decision requires merchant consultation'),
        },
      };
    },
    async executeConfirmed(_ctx, payload) {
      return {
        success: true,
        result: 'HITL gate recorded — awaiting merchant approval',
        payload,
      };
    },
  };
}
