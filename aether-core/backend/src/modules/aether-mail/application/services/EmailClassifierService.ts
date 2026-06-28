import { defaultOllamaInference } from '../../../../shared/ai/OllamaInferenceAdapter';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';

export interface ClassificationResult {
  category: string;
  riskLevel: 'low' | 'high';
  confidence: number;
  reason: string;
  source: 'ollama' | 'heuristic';
}

const HIGH_RISK_CATEGORIES = new Set(['complaint', 'return_request', 'payment_issue', 'legal']);
const LLM_INPUT_MAX = 4096;

export class EmailClassifierService {
  constructor(private llm: LlmInferencePort = defaultOllamaInference) {}

  /** Redact PII and truncate before sending to LLM. */
  sanitizeForLlm(text: string): string {
    const redacted = text
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email-redacted]')
      .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[phone-redacted]');
    return redacted.slice(0, LLM_INPUT_MAX);
  }

  async classify(
    email: {
      from: string;
      subject?: string;
      body?: string;
    },
    context?: {
      customerName?: string | null;
      recentOrderCount?: number;
      priorEmailCount?: number;
      ragSnippets?: string[];
    }
  ): Promise<ClassificationResult> {
    const text = this.sanitizeForLlm(`${email.subject || ''} ${email.body || ''}`.trim());
    const ragBlock =
      context?.ragSnippets?.length ?
        `\nPrior merchant interactions:\n${context.ragSnippets.map((s) => `- ${s}`).join('\n')}\n`
      : '';
    const contextBlock = context
      ? `\nCustomer context: name=${context.customerName ?? 'unknown'}, recentOrders=${context.recentOrderCount ?? 0}, priorEmails=${context.priorEmailCount ?? 0}${ragBlock}`
      : ragBlock;

    try {
      const prompt = `Classify this e-commerce email. Categories: order_status, tracking_request, simple_question, complaint, return_request, payment_issue, supplier, spam, internal.
Return ONLY JSON: {"category":"...","confidence":0.0-1.0,"reason":"..."}
${contextBlock}

Email:
${text.slice(0, 2000)}`;

      const raw = await this.llm.generate({ prompt, temperature: 0.1 });
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { category: string; confidence: number; reason?: string };
        const category = parsed.category?.toLowerCase() ?? 'simple_question';
        const confidence = Math.min(1, Math.max(0, parsed.confidence ?? 0.5));
        const riskLevel = HIGH_RISK_CATEGORIES.has(category) || confidence < 0.85 ? 'high' : 'low';
        return {
          category,
          riskLevel,
          confidence,
          reason: parsed.reason ?? 'LLM classification',
          source: 'ollama',
        };
      }
    } catch {
      // fall through to heuristic
    }

    return this.heuristicClassify(text);
  }

  private heuristicClassify(text: string): ClassificationResult {
    const lower = text.toLowerCase();
    const highRiskKeywords = ['refund', 'complaint', 'lawyer', 'legal', 'angry'];
    const isHighRisk = highRiskKeywords.some((k) => lower.includes(k));
    return {
      category: isHighRisk ? 'complaint' : 'simple_question',
      riskLevel: isHighRisk ? 'high' : 'low',
      confidence: 0.55,
      reason: 'Heuristic fallback (Ollama unavailable) — treat as experimental path',
      source: 'heuristic',
    };
  }
}
