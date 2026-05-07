export interface ClassificationResult {
  riskLevel: 'low' | 'high';
  confidence: number;
  reason: string;
}

export class EmailClassifierService {
  async classify(email: {
    from: string;
    subject?: string;
    body?: string;
  }): Promise<ClassificationResult> {
    // TODO: Replace with real LLM call (Ollama)
    // For now: simple heuristic

    const text = `${email.subject || ''} ${email.body || ''}`.toLowerCase();

    // High risk keywords
    const highRiskKeywords = ['refund', 'complaint', 'lawyer', 'legal', 'angry', 'terrible', 'worst'];

    const isHighRisk = highRiskKeywords.some(keyword => text.includes(keyword));

    if (isHighRisk) {
      return {
        riskLevel: 'high',
        confidence: 0.85,
        reason: 'Contains high-risk keywords (refund/complaint/legal)',
      };
    }

    return {
      riskLevel: 'low',
      confidence: 0.75,
      reason: 'No high-risk signals detected',
    };
  }
}