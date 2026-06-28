import { defaultOllamaInference } from '../../../shared/ai/OllamaInferenceAdapter';
import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';
import { logger } from '../../../shared/logging/logger';
import type { ExplainabilityBuildContext, ExplainabilityPayload } from './types';
import { agentExplainLabel } from './agentLabels';

const MAX_TOKENS_HINT = 400;

function buildPrompt(ctx: ExplainabilityBuildContext, templateSummary: string): string {
  const agents = ctx.agents.map((a) => `- ${a.label}${a.contribution ? `: ${a.contribution}` : ''}`).join('\n');
  const data = ctx.dataSources.slice(0, 8).map((d) => `- ${d.label}`).join('\n');
  const reasoning = ctx.reasoningSteps
    .slice(0, 6)
    .map((s) => `- ${s.label}${s.detail ? `: ${s.detail.slice(0, 120)}` : ''}`)
    .join('\n');

  return `Je bent een uitleg-assistent voor een e-commerce merchant dashboard (AETHER).
Schrijf één korte, begrijpelijke Nederlandse paragraaf (max ${MAX_TOKENS_HINT} tokens) die uitlegt wat er gebeurde en waarom.
Gebruik geen technische jargon. Noem agents bij hun label.

Systeemsamenvatting (fallback): ${templateSummary}

Betrokken agents:
${agents || '(geen)'}

Gebruikte data:
${data || '(geen)'}

Redenering:
${reasoning || '(geen)'}

Antwoord alleen met de paragraaf, geen opsomming of titel.`;
}

export class ExplainabilityNarrativeService {
  constructor(private llm: LlmInferencePort = defaultOllamaInference) {}

  async generateSummary(
    ctx: ExplainabilityBuildContext,
    templateSummary: string
  ): Promise<string | null> {
    try {
      const prompt = buildPrompt(ctx, templateSummary);
      const text = await this.llm.generate({ prompt, temperature: 0.3 });
      const trimmed = text.trim();
      if (!trimmed || trimmed.length < 20) return null;
      return trimmed.slice(0, 2000);
    } catch (err) {
      logger.warn('explainability_narrative_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  applyLlmSummary(payload: ExplainabilityPayload, llmSummary: string): ExplainabilityPayload {
    return { ...payload, summary: llmSummary };
  }

  static buildContextFromPayload(payload: ExplainabilityPayload): ExplainabilityBuildContext {
    return {
      agents: payload.agents.map((a) => ({
        ...a,
        label: a.label || agentExplainLabel(a.agentKey),
      })),
      dataSources: payload.dataSources,
      reasoningSteps: payload.reasoningSteps,
      reflections: payload.reflections,
      handoffChain: payload.handoffChain ?? [],
      policyNotes: payload.policyNotes ?? [],
      globalKnowledge: payload.globalKnowledge,
    };
  }
}

export const explainabilityNarrativeService = new ExplainabilityNarrativeService();
