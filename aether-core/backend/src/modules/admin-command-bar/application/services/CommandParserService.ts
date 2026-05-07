export class CommandParserService {
  async parseCommand(naturalLanguage: string): Promise<any> {
    const lower = naturalLanguage.toLowerCase();

    // Simple keyword-based parsing (later: replace with local LLM call)
    if (lower.includes('price') && lower.includes('lower')) {
      return { intent: 'PRICE_UPDATE', action: 'lower', confidence: 0.92 };
    }
    if (lower.includes('margin') && lower.includes('below')) {
      return { intent: 'REPORT_LOW_MARGIN', action: 'query', confidence: 0.88 };
    }
    if (lower.includes('approve')) {
      return { intent: 'APPROVE_CHANGES', action: 'approve', confidence: 0.95 };
    }
    if (lower.includes('show') && lower.includes('product')) {
      return { intent: 'QUERY_PRODUCTS', action: 'query', confidence: 0.85 };
    }

    return { intent: 'UNKNOWN', action: null, confidence: 0.3 };
  }
}