import { logger } from '../../../shared/logging/logger';
import { getMerchantSettings } from '../../../shared/settings/TenantSettingsService';
import {
  isExplainabilityLlmSummaryEnabled,
  resolveExplainabilityNarrativeJobIntervalMs,
} from './explainabilityConfig';
import { explainabilityPersister } from './ExplainabilityPersister';
import {
  ExplainabilityNarrativeService,
  explainabilityNarrativeService,
} from './ExplainabilityNarrativeService';
import type { ExplainabilityPayload, ExplainabilitySourceType } from './types';

export class ExplainabilityNarrativeJob {
  private timer: NodeJS.Timeout | null = null;

  constructor(private narrative: ExplainabilityNarrativeService = explainabilityNarrativeService) {}

  start(): void {
    if (!isExplainabilityLlmSummaryEnabled()) {
      logger.info('explainability_narrative_job_disabled');
      return;
    }
    const intervalMs = resolveExplainabilityNarrativeJobIntervalMs();
    void this.runBatch();
    this.timer = setInterval(() => void this.runBatch(), intervalMs);
    logger.info('explainability_narrative_job_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runBatch(): Promise<number> {
    const pending = await explainabilityPersister.listPendingLlm(15);
    let updated = 0;

    for (const row of pending) {
      const settings = await getMerchantSettings(row.tenantId);
      if (!settings.explainabilityPrefs.useLlmSummary) continue;
      if (settings.explainabilityPrefs.detailLevel === 'off') continue;

      const payload = row.payload as unknown as ExplainabilityPayload;
      const ctx = ExplainabilityNarrativeService.buildContextFromPayload(payload);
      const llmSummary = await this.narrative.generateSummary(ctx, row.summary);
      if (!llmSummary) continue;

      const nextPayload = this.narrative.applyLlmSummary(payload, llmSummary);
      await explainabilityPersister.updateLlmSummary(
        row.tenantId,
        row.sourceType as ExplainabilitySourceType,
        row.sourceId,
        llmSummary,
        nextPayload
      );
      updated += 1;
    }

    if (updated > 0) {
      logger.info('explainability_narrative_batch_done', { updated });
    }
    return updated;
  }
}

export const explainabilityNarrativeJob = new ExplainabilityNarrativeJob();
