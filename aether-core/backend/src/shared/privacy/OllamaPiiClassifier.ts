import type { LlmInferencePort } from '../ai/LlmInferencePort';
import { defaultOllamaInference } from '../ai/OllamaInferenceAdapter';
import type { PiiDetectionPort, PiiScanResult } from './PiiDetectionPort';

export class OllamaPiiClassifier implements PiiDetectionPort {
  constructor(private llm: LlmInferencePort = defaultOllamaInference) {}

  async scan(text: string): Promise<PiiScanResult> {
    if (text.length < 10) {
      return { safe: true, categories: [], source: 'none' };
    }

    const prompt = `Analyze if this text contains personally identifiable information (names, emails, addresses, phone numbers, IBAN, order IDs tied to individuals).
Text: """${text.slice(0, 2000)}"""
Reply with JSON only: {"safe": boolean, "categories": string[]}`;

    try {
      const raw = await this.llm.generate({ prompt, temperature: 0 });
      const parsed = JSON.parse(raw.trim()) as { safe?: boolean; categories?: string[] };
      const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
      return {
        safe: parsed.safe !== false && categories.length === 0,
        categories,
        source: 'nlp',
      };
    } catch {
      return { safe: false, categories: ['nlp_parse_failed'], source: 'nlp' };
    }
  }
}
