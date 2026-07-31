import { prisma } from '../../../../shared/prisma/client';
import { logger } from '../../../../shared/logging/logger';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { withServerSpan } from '../../../../shared/observability/sentry';
import {
  isStorefrontOrganismEnabled,
  resolveOrganismIntervalMs,
} from '../../application/services/storefrontOrganismConfig';

/**
 * Periodic storefront organism tick: heal broken live sites (dead-man).
 * Wall triggers also fire from website.build.finished event handlers.
 */
export class StorefrontOrganismJob {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (!isStorefrontOrganismEnabled()) {
      logger.info('storefront_organism_disabled');
      return;
    }
    const intervalMs = resolveOrganismIntervalMs();
    void this.runAll();
    this.timer = setInterval(() => void this.runAll(), intervalMs);
    logger.info('storefront_organism_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async runAll(): Promise<void> {
    if (!isStorefrontOrganismEnabled()) return;
    const { healBrokenLiveSites } = getCompositionRoot();
    if (!healBrokenLiveSites) return;

    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      try {
        await withServerSpan('storefront.organism.heal', { tenantId: tenant.id }, async () => {
          const results = await healBrokenLiveSites.execute(tenant.id);
          const actionable = results.filter((r) => r.action === 'healed' || r.action === 'demoted');
          if (actionable.length > 0) {
            logger.info('storefront_organism_heal_tick', {
              tenantId: tenant.id,
              actions: actionable,
            });
          }
        });
      } catch (error) {
        logger.warn('storefront_organism_heal_failed', {
          tenantId: tenant.id,
          error: String(error),
        });
      }
    }
  }
}

export const storefrontOrganismJob = new StorefrontOrganismJob();
