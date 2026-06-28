import { scanWithRegex } from '../../../../shared/privacy/PiiPatternLibrary';
import { defaultPiiDetector } from '../../../../shared/privacy/CompositePiiDetector';
import { writeAuditLog } from '../../../../shared/audit/auditService';

export interface SafetyClassification {
  safe: boolean;
  score: number;
  reasons: string[];
}

export class DistillationSafetyClassifier {
  classify(content: string, occurrenceCount: number): SafetyClassification {
    const reasons: string[] = [];
    let score = 1;

    const piiHits = scanWithRegex(content);
    if (piiHits.length > 0) {
      reasons.push('pii_detected');
      score -= 0.5;
    }

    if (occurrenceCount < 3) {
      reasons.push('insufficient_occurrences');
      score -= 0.3;
    }

    if (content.length < 20) {
      reasons.push('content_too_short');
      score -= 0.2;
    }

    return { safe: score >= 0.7 && !reasons.includes('pii_detected'), score, reasons };
  }

  async classifyWithNlp(content: string, occurrenceCount: number): Promise<SafetyClassification> {
    const base = this.classify(content, occurrenceCount);
    if (!base.safe) return base;

    const nlp = await defaultPiiDetector.scan(content);
    if (!nlp.safe) {
      return {
        safe: false,
        score: 0,
        reasons: [...base.reasons, 'pii_detected_nlp', ...nlp.categories],
      };
    }
    return base;
  }

  /** Stricter safety for reflection-sourced distillation (always draft, no auto-promote). */
  classifyReflectionContent(content: string, occurrenceCount: number): SafetyClassification {
    const base = this.classify(content, occurrenceCount);
    if (!base.safe) return base;

    const merchantPatterns = [
      /\b(order|sku|product)[-_]?\d+/gi,
      /\b€\s?\d+/g,
      /\b\d{10,}\b/g,
    ];
    for (const pattern of merchantPatterns) {
      if (pattern.test(content)) {
        return {
          safe: false,
          score: 0,
          reasons: [...base.reasons, 'merchant_data_detected'],
        };
      }
    }

    return { ...base, score: Math.min(base.score, 0.95) };
  }

  async classifyReflectionWithNlp(
    content: string,
    occurrenceCount: number
  ): Promise<SafetyClassification> {
    const base = this.classifyReflectionContent(content, occurrenceCount);
    if (!base.safe) return base;
    return this.classifyWithNlp(content, occurrenceCount);
  }
}

export class PatternGeneralizer {
  generalize(intent: string, command: string, result: string): string {
    const cleaned = result
      .replace(/\b(tenant|merchant)[-_]?\w+/gi, '[merchant]')
      .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/gi, '[email]')
      .slice(0, 500);
    return `When handling ${intent} requests like "${command.slice(0, 80)}", a effective approach is: ${cleaned}`;
  }
}

export class DistillationGovernance {
  constructor(private classifier = new DistillationSafetyClassifier()) {}

  canAutoPromote(content: string, occurrenceCount: number, safetyScore: number): boolean {
    const classification = this.classifier.classify(content, occurrenceCount);
    return (
      classification.safe &&
      safetyScore >= 0.85 &&
      occurrenceCount >= Number(process.env.DISTILLATION_MIN_OCCURRENCES ?? 5)
    );
  }
}

export class FeedbackLoopMetrics {
  async recordPatchEffectiveness(
    tenantId: string,
    patchId: string,
    metric: 'goal_reached' | 'approval_rate' | 'uplift',
    value: number
  ): Promise<void> {
    await writeAuditLog({
      tenantId,
      module: 'global-knowledge',
      action: 'patch_effectiveness',
      details: { patchId, metric, value },
    });
  }
}
