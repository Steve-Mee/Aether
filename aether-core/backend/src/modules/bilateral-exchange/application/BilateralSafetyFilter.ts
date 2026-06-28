import { ContributionSafetyFilter } from '../../../ai/intelligence/knowledge-transfer/contribution/ContributionSafetyFilter';
import type { AnonymizedInsight } from '../../../ai/intelligence/knowledge-transfer/KnowledgeTransferPort';
import { BILATERAL_FORBIDDEN_FIELDS } from '../domain/bilateralSchemas';

export interface BilateralFilterResult {
  accepted: Record<string, unknown>;
  rejected: string[];
}

export class BilateralSafetyFilter {
  private contributionFilter = new ContributionSafetyFilter();

  filterPayload(
    payload: Record<string, unknown>,
    allowedFields: string[]
  ): BilateralFilterResult {
    const allowed = new Set(allowedFields.map((f) => f.toLowerCase()));
    const accepted: Record<string, unknown> = {};
    const rejected: string[] = [];

    for (const [key, value] of Object.entries(payload)) {
      const normalized = key.toLowerCase();
      if (BILATERAL_FORBIDDEN_FIELDS.has(normalized)) {
        rejected.push(`${key}:forbidden_field`);
        continue;
      }
      if (!allowed.has(normalized)) {
        rejected.push(`${key}:not_in_allowlist`);
        continue;
      }
      if (this.looksLikePii(String(value))) {
        rejected.push(`${key}:pii_detected`);
        continue;
      }
      accepted[key] = value;
    }

    return { accepted, rejected };
  }

  /** Reuse contribution taxonomy for metric-shaped bilateral fields. */
  validateMetricInsight(insight: AnonymizedInsight): boolean {
    const result = this.contributionFilter.validateOne(insight);
    return result.accepted;
  }

  private looksLikePii(value: string): boolean {
    if (/@/.test(value)) return true;
    if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(value)) return true;
    return false;
  }
}
