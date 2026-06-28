import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { ProactiveSuggestionRecord } from '../ProactiveSuggestionRepository';
import type { ProactiveSuggestionRepository } from '../ProactiveSuggestionRepository';
import { proactiveSuggestionEmitter } from '../ProactiveSuggestionEmitter';
import { notifyOverviewProactive } from '../../../../modules/admin-command-bar/application/services/OverviewFeedNotify';
import {
  isProactiveLlmEnrichmentEnabled,
  resolveProactiveEnrichmentMaxPerHour,
} from '../proactiveConfig';
import { logger } from '../../../../shared/logging/logger';

import type { ProactiveGlobalHintService } from '../global/ProactiveGlobalHintService';

export class ProactiveEnrichmentService {
  private hourlyCount = new Map<string, { hour: string; count: number }>();

  constructor(
    private repository: ProactiveSuggestionRepository,
    private adminData: AdminDataPort,
    private globalHints?: ProactiveGlobalHintService
  ) {}

  private canEnrich(tenantId: string): boolean {
    if (!isProactiveLlmEnrichmentEnabled()) return false;
    const hour = new Date().toISOString().slice(0, 13);
    const entry = this.hourlyCount.get(tenantId);
    const max = resolveProactiveEnrichmentMaxPerHour();
    if (!entry || entry.hour !== hour) {
      this.hourlyCount.set(tenantId, { hour, count: 0 });
      return true;
    }
    return entry.count < max;
  }

  private bumpCount(tenantId: string): void {
    const hour = new Date().toISOString().slice(0, 13);
    const entry = this.hourlyCount.get(tenantId);
    if (!entry || entry.hour !== hour) {
      this.hourlyCount.set(tenantId, { hour, count: 1 });
    } else {
      entry.count += 1;
    }
  }

  async enqueue(record: ProactiveSuggestionRecord): Promise<void> {
    if (record.enrichedAt) return;
    if (!isProactiveLlmEnrichmentEnabled()) return;
    void this.enrichRecord(record.tenantId, record.id).catch((err) => {
      logger.warn('proactive_enrichment_failed', {
        tenantId: record.tenantId,
        id: record.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  async enrichRecord(tenantId: string, id: string): Promise<boolean> {
    if (!this.canEnrich(tenantId)) return false;

    const record = await this.repository.findById(tenantId, id);
    if (!record || record.enrichedAt) return false;

    const evidence = record.evidence ?? {};
    const productHints: string[] = [];

    const skus = evidence.lowStockSkus;
    if (Array.isArray(skus) && skus.length > 0) {
      const products = await this.adminData.listProductsForBrain(tenantId, 20);
      const idSet = new Set(
        skus
          .map((s) => (s && typeof s === 'object' ? String((s as { productId?: string }).productId ?? '') : ''))
          .filter(Boolean)
      );
      for (const p of products) {
        if (idSet.has(p.id)) productHints.push(p.name);
        if (productHints.length >= 3) break;
      }
    }

    let title = record.title;
    let summary = record.summary ?? '';

    if (productHints.length > 0) {
      const names = productHints.join(', ');
      summary = `${summary} Betrokken producten: ${names}.`.trim();
      if (!title.includes(names.slice(0, 20))) {
        title = `${title} (${names})`;
      }
    }

    if (typeof evidence.supplierName === 'string' && evidence.supplierName) {
      summary = `${summary} Leverancier: ${evidence.supplierName}.`.trim();
    }

    if (this.globalHints) {
      const hint = await this.globalHints.getHint(tenantId, record.triggerId);
      if (hint) {
        summary = `${summary} ${this.globalHints.formatHintText(hint)}`.trim();
      }
    }

    const updated = await this.repository.updateEnrichment(tenantId, id, {
      title: title.slice(0, 500),
      summary: summary.slice(0, 1000) || null,
      enrichmentSource: productHints.length > 0 ? 'context' : 'template',
    });

    if (updated) {
      this.bumpCount(tenantId);
      const active = await this.repository.listActive(tenantId, 50);
      proactiveSuggestionEmitter.emit(tenantId, 'updated', [id], active.length);
      const refreshed = await this.repository.findById(tenantId, id);
      if (refreshed) notifyOverviewProactive(tenantId, 'updated', refreshed);
    }

    return updated;
  }

  async processPendingBatch(tenantId: string, limit = 5): Promise<number> {
    if (!isProactiveLlmEnrichmentEnabled()) return 0;
    const pending = await this.repository.listPendingEnrichment(tenantId, limit);
    let enriched = 0;
    for (const row of pending) {
      if (await this.enrichRecord(tenantId, row.id)) enriched += 1;
    }
    return enriched;
  }
}
