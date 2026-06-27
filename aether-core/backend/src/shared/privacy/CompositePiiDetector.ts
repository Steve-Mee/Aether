import type { PiiDetectionPort, PiiScanResult } from './PiiDetectionPort';
import { RegexPiiDetector } from './RegexPiiDetector';
import { OllamaPiiClassifier } from './OllamaPiiClassifier';

export class CompositePiiDetector implements PiiDetectionPort {
  constructor(
    private regex: PiiDetectionPort = new RegexPiiDetector(),
    private nlp?: PiiDetectionPort
  ) {}

  async scan(text: string, options?: { allowStructuredMetrics?: boolean }): Promise<PiiScanResult> {
    const regexResult = await this.regex.scan(text, options);
    if (!regexResult.safe) return regexResult;

    const useNlp =
      process.env.INTELLIGENCE_PII_NLP === 'true' &&
      text.length > 40 &&
      !options?.allowStructuredMetrics;

    if (!useNlp || !this.nlp) {
      return regexResult;
    }

    const nlpResult = await this.nlp.scan(text);
    if (!nlpResult.safe) return nlpResult;
    return regexResult;
  }
}

export function createDefaultPiiDetector(): PiiDetectionPort {
  return new CompositePiiDetector(new RegexPiiDetector(), new OllamaPiiClassifier());
}

export const defaultPiiDetector = createDefaultPiiDetector();
