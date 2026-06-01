import { defaultOllamaInference } from '../../../../shared/ai/OllamaInferenceAdapter';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';

export class CommandParserService {
  constructor(private llm: LlmInferencePort = defaultOllamaInference) {}

  async parseCommand(naturalLanguage: string): Promise<any> {
    try {
      const prompt = `Je bent AETHER, een slimme AI voor e-commerce merchants. 
Analyseer dit commando en geef een JSON response terug met:
- intent: (PRICE_UPDATE, LOW_MARGIN_REPORT, APPROVE_CHANGES, CREATE_PRODUCT, etc.)
- action: (lower, raise, query, approve, etc.)
- parameters: object met extra info (bijv. { percentage: 8, color: "red", product: "sneakers" })
- confidence: getal tussen 0 en 1

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
}
