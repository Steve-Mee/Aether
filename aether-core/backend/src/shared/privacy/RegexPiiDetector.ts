import { scanWithRegex } from './PiiPatternLibrary';
import type { PiiDetectionPort, PiiScanResult } from './PiiDetectionPort';

export class RegexPiiDetector implements PiiDetectionPort {
  async scan(text: string, options?: { allowStructuredMetrics?: boolean }): Promise<PiiScanResult> {
    if (options?.allowStructuredMetrics && /^[\w.-]+:[\w.-]+:-?\d+(\.\d+)?$/.test(text.trim())) {
      return { safe: true, categories: [], source: 'none' };
    }
    const categories = scanWithRegex(text);
    return {
      safe: categories.length === 0,
      categories,
      source: categories.length > 0 ? 'regex' : 'none',
    };
  }
}

export const defaultRegexPiiDetector = new RegexPiiDetector();
