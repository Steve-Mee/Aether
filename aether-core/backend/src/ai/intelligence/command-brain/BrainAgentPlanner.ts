import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../shared/ai/OllamaInferenceAdapter';
import type { CompoundStep } from '../agent-runtime/types';
import type { PersonalBrainToolRegistry } from '../personal-brain/tools/PersonalBrainToolRegistry';
import type { BrainToolTraceEntry } from '../personal-brain/tools/types';
import {
  type AgentPlan,
  isPlanningEnabled,
  MAX_PLAN_STEPS,
  normalizeAgentPlan,
  singleStepPlan,
} from './types/AgentPlan';
import type { StepReflection } from './types/StepReflection';
import { isDynamicReplanEnabled } from './types/StepReflection';

export interface GeneratePlanInput {
  command: string;
  parsedIntent: string;
  contextSnippets: string[];
  handlerResult: string;
  deferToTools?: boolean;
  collectiveSnippets?: string[];
  subGoals?: CompoundStep[];
  tenantId?: string;
  memoryPromptBlock?: string;
  allowedTools?: string[];
  agentKey?: string;
  rolePrompt?: string;
}

export interface ReplanInput {
  command: string;
  parsedIntent: string;
  currentPlan: AgentPlan;
  reflection?: StepReflection;
  errorMessage?: string;
  toolTrace: BrainToolTraceEntry[];
  contextSnippets: string[];
  collectiveSnippets?: string[];
  tenantId?: string;
  allowedTools?: string[];
  agentKey?: string;
  rolePrompt?: string;
}

export class BrainAgentPlanner {
  constructor(
    private tools: PersonalBrainToolRegistry,
    private llm: LlmInferencePort = defaultOllamaInference
  ) {}

  shouldPlan(): boolean {
    return isPlanningEnabled();
  }

  async generatePlan(input: GeneratePlanInput): Promise<AgentPlan> {
    if (!this.shouldPlan()) {
      return singleStepPlan(input.command);
    }

    const prompt = this.buildPlanPrompt(input, 'initial');

    try {
      const text = await this.llm.generate({ prompt, temperature: 0.1 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return singleStepPlan(input.command);
      }
      return normalizeAgentPlan(JSON.parse(jsonMatch[0]), input.command);
    } catch {
      return singleStepPlan(input.command);
    }
  }

  async replan(input: ReplanInput): Promise<AgentPlan> {
    if (!isDynamicReplanEnabled()) {
      return input.currentPlan;
    }

    const revision = (input.currentPlan.revision ?? 1) + 1;
    const reason =
      input.errorMessage ??
      input.reflection?.observation ??
      input.reflection?.revisedGoal ??
      'Onvoldoende resultaat';

    const prompt = `${this.buildPlanPrompt(
      {
        command: input.command,
        parsedIntent: input.parsedIntent,
        contextSnippets: input.contextSnippets,
        handlerResult: reason,
        collectiveSnippets: input.collectiveSnippets,
      },
      'replan'
    )}

Huidig plan (revision ${input.currentPlan.revision ?? 1}):
Doel: ${input.currentPlan.goal}
Stappen: ${input.currentPlan.steps.map((s) => s.label).join(' → ')}

Tool trace: ${input.toolTrace.map((t) => `${t.tool}:${t.status ?? 'ok'}`).join(', ')}

Herzie het plan (max ${MAX_PLAN_STEPS} stappen). JSON:`;

    try {
      const text = await this.llm.generate({ prompt, temperature: 0.15 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { ...input.currentPlan, revision };
      }
      const plan = normalizeAgentPlan(JSON.parse(jsonMatch[0]), input.currentPlan.goal);
      return {
        ...plan,
        revision,
        supersedes: input.currentPlan.goal,
      };
    } catch {
      return { ...input.currentPlan, revision };
    }
  }

  private buildPlanPrompt(input: GeneratePlanInput, mode: 'initial' | 'replan'): string {
    const contextBlock =
      input.contextSnippets.length > 0
        ? `\nContext:\n${input.contextSnippets.map((s) => `- ${s}`).join('\n')}`
        : '';
    const collectiveBlock =
      input.collectiveSnippets?.length ?
        `\nCollectieve merchant intelligence:\n${input.collectiveSnippets.map((s) => `- ${s}`).join('\n')}\n`
      : '';
    const deferBlock =
      input.deferToTools ?
        '\nMutaties moeten via propose-tools of createApproval (geen directe destructive acties).\n'
      : '';
    const subGoalsBlock =
      input.subGoals?.length ?
        `\nSub-doelen (compound workflow):\n${input.subGoals.map((s) => `${s.index}. [${s.intent}] ${s.command}`).join('\n')}\n`
      : '';
    const memoryBlock = input.memoryPromptBlock ? `\n${input.memoryPromptBlock}\n` : '';

    const modeLine =
      mode === 'replan' ?
        'Herzie het bestaande plan op basis van nieuwe informatie.'
      : 'Maak een kort uitvoeringsplan';

    const roleLine =
      input.rolePrompt ??
      (input.agentKey && input.agentKey !== 'admin'
        ? `Je bent de ${input.agentKey} specialist van AETHER.`
        : 'Je bent AETHER, het persoonlijke brein van een e-commerce merchant.');

    const toolsPrompt =
      input.allowedTools?.length
        ? this.tools.getSchemaPromptForAgent(input.agentKey ?? 'admin', input.allowedTools)
        : this.tools.getSchemaPrompt();

    return `${roleLine}
${modeLine} (max ${MAX_PLAN_STEPS} stappen).

Commando: "${input.command}"
Intent: ${input.parsedIntent}
Handler resultaat: ${input.handlerResult}${contextBlock}${collectiveBlock}${deferBlock}${subGoalsBlock}${memoryBlock}

Beschikbare tools:
${toolsPrompt}

Regels:
- Geef alleen JSON terug: { "goal": "...", "reasoning": "...", "steps": [{ "label": "...", "toolHint": "optioneel", "riskHint": "low|medium|high" }] }
- Max ${MAX_PLAN_STEPS} stappen
- High-risk mutaties via propose-tools of createApproval
- Low-risk reads mogen automatisch

JSON:`;
  }
}
