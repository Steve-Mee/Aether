import { scanWithRegex } from '../../../../../shared/privacy/PiiPatternLibrary';

const PRICE_PATTERN = /€\s?\d+[.,]?\d*|\$\s?\d+[.,]?\d*|\d+[.,]\d{2}\s?(eur|usd)/gi;
const SKU_PATTERN = /\bSKU[-:]?\w+\b/gi;
const EMAIL_PATTERN = /\b[\w.+-]+@[\w.-]+\.\w+\b/gi;

export class SummaryDistiller {
  distill(raw: string, maxLen = 500): string {
    let text = raw.slice(0, maxLen * 2);
    text = text.replace(PRICE_PATTERN, '[price]');
    text = text.replace(SKU_PATTERN, '[sku]');
    text = text.replace(EMAIL_PATTERN, '[email]');
    const pii = scanWithRegex(text);
    for (const match of pii) {
      text = text.replace(match, '[redacted]');
    }
    if (/\btenant[-_]?[a-z0-9]+\b/i.test(text)) {
      text = text.replace(/\btenant[-_]?[a-z0-9]+\b/gi, '[tenant]');
    }
    return text.slice(0, maxLen).trim();
  }
}
