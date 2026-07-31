import type { TenantDirectoryPort } from '../../ports/TenantDirectoryPort';
import type { OverviewNotificationDispatcher } from '../OverviewNotificationDispatcher';
import { logger } from '../../../../../shared/logging/logger';

const DIGEST_INTERVAL_MS = 24 * 60 * 60 * 1000;

export class OverviewDigestJob {
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private tenantDirectory: TenantDirectoryPort,
    private overviewNotificationDispatcher: OverviewNotificationDispatcher,
  ) {}

  start(intervalMs = DIGEST_INTERVAL_MS): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.runAll(), intervalMs);
    void this.runAll();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async runAll(): Promise<void> {
    const since = new Date(Date.now() - DIGEST_INTERVAL_MS);
    const tenantIds = await this.tenantDirectory.listTenantIds();
    for (const tenantId of tenantIds) {
      try {
        const sent = await this.overviewNotificationDispatcher.sendDigestForTenant(tenantId, since);
        if (sent > 0) {
          logger.info('overview_digest_sent', { tenantId, count: sent });
        }
      } catch (err) {
        logger.warn('overview_digest_failed', {
          tenantId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}
