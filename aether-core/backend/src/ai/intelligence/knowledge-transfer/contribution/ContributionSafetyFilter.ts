import type { AnonymizedInsight } from '../KnowledgeTransferPort';
import { scanWithRegex } from '../../../../shared/privacy/PiiPatternLibrary';
import {
  isAllowedCategory,
  isAllowedMetric,
  isValueInBounds,
} from './contributionTaxonomy';

export type ContributionSource =
  | 'agent_run'
  | 'tool_outcome'
  | 'domain_event'
  | 'orchestrator';

export interface FilteredInsight {
  insight: AnonymizedInsight;
  accepted: boolean;
  rejectReason?: string;
}

export interface FilterResult {
  accepted: AnonymizedInsight[];
  rejected: FilteredInsight[];
}

export class ContributionSafetyFilter {
  filter(insights: AnonymizedInsight[]): FilterResult {
    const accepted: AnonymizedInsight[] = [];
    const rejected: FilteredInsight[] = [];

    for (const insight of insights) {
      const result = this.validateOne(insight);
      if (result.accepted) {
        accepted.push(insight);
      } else {
        rejected.push(result);
      }
    }

    return { accepted, rejected };
  }

  validateOne(insight: AnonymizedInsight): FilteredInsight {
    if (!isAllowedCategory(insight.category)) {
      return {
        insight,
        accepted: false,
        rejectReason: 'invalid_category',
      };
    }

    if (!isAllowedMetric(insight.metric)) {
      return {
        insight,
        accepted: false,
        rejectReason: 'invalid_metric',
      };
    }

    if (!isValueInBounds(insight.metric, insight.value)) {
      return {
        insight,
        accepted: false,
        rejectReason: 'value_out_of_bounds',
      };
    }

    const serialized = `${insight.category}:${insight.metric}:${insight.value}`;
    const piiHits = scanWithRegex(serialized);
    if (piiHits.length > 0) {
      return {
        insight,
        accepted: false,
        rejectReason: 'pii_detected',
      };
    }

    if (insight.sampleSize != null && (!Number.isInteger(insight.sampleSize) || insight.sampleSize < 1)) {
      return {
        insight,
        accepted: false,
        rejectReason: 'invalid_sample_size',
      };
    }

    return { insight, accepted: true };
  }
}
