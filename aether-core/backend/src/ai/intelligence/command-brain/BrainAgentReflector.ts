import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../shared/ai/OllamaInferenceAdapter';
import type { AgentPlan } from './types/AgentPlan';
import {
  isReflectionEnabled,
  normalizeStepReflection,
  type StepReflection,
} from './types/StepReflection';

export interface ReflectStepInput {
  command: string;
  plan: AgentPlan;
  planStepIndex: number;
  tool: string;
  toolOutput: string;
}

export class BrainAgentReflector {
  constructor(private llm: LlmInferencePort = defaultOllamaInference) {}

  shouldReflect(): boolean {
    return isReflectionEnabled();
  }

  async reflectStep(input: ReflectStepInput): Promise<StepReflection> {
    if (!this.shouldReflect()) {
      return {
        sufficient: true,
        goalReached: false,
        observation: 'Reflection uitgeschakeld — doorgaan.',
        nextAction: 'continue',
      };
    }

    const stepLabel =
      input.plan.steps[input.planStepIndex - 1]?.label ?? `Stap ${input.planStepIndex}`;

    const prompt = `Je evalueert een agent-stap voor een e-commerce merchant.

Doel: ${input.plan.goal}
Commando: "${input.command}"
Voltooide stap: ${stepLabel}
Tool: ${input.tool}
Tool resultaat: ${input.toolOutput.slice(0, 800)}

Beoordeel of dit voldoende is. Geef JSON:
{
  "sufficient": true|false,
  "goalReached": true|false,
  "observation": "korte evaluatie",
  "nextAction": "continue"|"replan"|"conclude",
  "revisedGoal": "optioneel nieuw doel bij replan"
}

Regels:
- nextAction "conclude" alleen als het volledige doel bereikt is
- nextAction "replan" als resultaat onvoldoende of onverwacht is
- nextAction "continue" als volgende planstap logisch is

JSON:`;

    try {
      const text = await this.llm.generate({ prompt, temperature: 0.1 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return normalizeStepReflection(null);
      }
      return normalizeStepReflection(JSON.parse(jsonMatch[0]));
    } catch {
      return normalizeStepReflection(null);
    }
  }
}
