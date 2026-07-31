import { defaultOllamaInference } from '../../../../shared/ai/OllamaInferenceAdapter';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import type { CompoundParseResult } from '../../../../ai/intelligence/agent-runtime/CompoundCommandParser';
import { MAX_COMPOUND_STEPS } from '../../../../ai/intelligence/agent-runtime/CompoundCommandParser';

export interface CommandParseContext {
  contextSnippets?: string[];
  memorySnippets?: string[];
  collectiveSnippets?: string[];
  globalKnowledgeSnippets?: string[];
  knowledgeUpdateSnippets?: string[];
  brainContext?: {
    loraAdapterId?: string;
    lastIntent?: string;
    traits?: string[];
  };
}

export class CommandParserService {
  constructor(private llm: LlmInferencePort = defaultOllamaInference) {}

  async parseCommand(naturalLanguage: string, options?: CommandParseContext): Promise<any> {
    try {
      const merchantBlock =
        options?.contextSnippets?.length ?
          `\nRelevante merchant data:\n${options.contextSnippets.map((s) => `- ${s}`).join('\n')}\n`
        : '';
      const memoryBlock =
        options?.memorySnippets?.length ?
          `\n${options.memorySnippets.join('\n')}\n`
        : '';
      const collectiveBlock =
        options?.collectiveSnippets?.length ?
          `\nCollectieve merchant intelligence:\n${options.collectiveSnippets.map((s) => `- ${s}`).join('\n')}\n`
        : '';
      const globalKnowledgeBlock =
        options?.globalKnowledgeSnippets?.length ?
          `\nAlgemene patronen (collectief brein):\n${options.globalKnowledgeSnippets.map((s) => `- ${s}`).join('\n')}\n`
        : '';
      const knowledgeUpdateBlock =
        options?.knowledgeUpdateSnippets?.length ?
          `\nKennis-updates:\n${options.knowledgeUpdateSnippets.map((s) => `- ${s}`).join('\n')}\n`
        : '';
      const traitsLine =
        options?.brainContext?.traits?.length ?
          ` traits=${options.brainContext.traits.join(', ')}`
        : '';
      const brainBlock =
        options?.brainContext ?
          `\nMerchant brein context: adapter=${options.brainContext.loraAdapterId ?? 'none'}, lastIntent=${options.brainContext.lastIntent ?? 'none'}${traitsLine}\n`
        : '';

      const prompt = `Je bent AETHER, een slimme AI voor e-commerce merchants. 
${merchantBlock}${memoryBlock}${collectiveBlock}${globalKnowledgeBlock}${knowledgeUpdateBlock}${brainBlock}
Analyseer dit commando en geef een JSON response terug met:
- intent: (PRICE_UPDATE, LOW_MARGIN_REPORT, APPROVE_CHANGES, CREATE_PRODUCT, STORE_BUILD, STORE_ITERATE, STORE_PUBLISH, STORE_STATUS, etc.)
- action: (lower, raise, query, approve, build, iterate, publish, etc.)
- parameters: object met extra info (bijv. { percentage: 8, color: "red", product: "sneakers", prompt: "...", deltaPrompt: "..." })
- confidence: getal tussen 0 en 1

Storefront intent hints (NL):
- STORE_BUILD: "bouw een webshop voor …", "maak mijn store"
- STORE_ITERATE: "maak de hero rustiger", "voeg FAQ toe"
- STORE_PUBLISH: "publiceer de website", "zet live"
- STORE_STATUS: "status van mijn website"

Commando: "${naturalLanguage}"

Antwoord alleen met geldige JSON, geen extra tekst.`;

      const text = await this.llm.generate({ prompt, temperature: 0.1 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        intent: 'UNKNOWN',
        action: null,
        parameters: {},
        confidence: 0.4,
      };
    } catch (error) {
      console.error('Ollama error:', error);
      return {
        intent: 'ERROR',
        action: null,
        parameters: { error: 'Kon niet verbinden met lokale AI' },
        confidence: 0,
      };
    }
  }

  /** LLM fallback when regex compound split finds no sequential sub-commands. */
  async tryDetectCompound(command: string): Promise<CompoundParseResult | null> {
    try {
      const prompt = `Analyseer of dit NL-commando meerdere opeenvolgende acties bevat (max ${MAX_COMPOUND_STEPS}).
Geef JSON: { "compound": true, "steps": ["sub-commando 1", "sub-commando 2"] } of { "compound": false }.
Alleen sequential stappen; geen parallelle taken.

Commando: "${command}"

JSON:`;

      const text = await this.llm.generate({ prompt, temperature: 0.1 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]) as { compound?: boolean; steps?: unknown };
      if (!parsed.compound || !Array.isArray(parsed.steps)) return null;

      const parts = parsed.steps
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, MAX_COMPOUND_STEPS);

      if (parts.length < 2) return null;

      return { original: command.trim(), parts };
    } catch {
      return null;
    }
  }
}
