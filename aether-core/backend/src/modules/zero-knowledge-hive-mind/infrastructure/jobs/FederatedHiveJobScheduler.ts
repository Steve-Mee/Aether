import { logger } from '../../../../shared/logging/logger';
import { runFederatedHiveJob } from './FederatedHiveJob';

const DEFAULT_TENANT = process.env.AETHER_DEFAULT_TENANT ?? 'tenant_default';

export class FederatedHiveJobScheduler {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (process.env.HIVE_FEDERATED_JOB_ENABLED === 'false') return;
    const intervalMs = parseInt(process.env.HIVE_FEDERATED_INTERVAL_MS ?? '3600000', 10);
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), intervalMs);
    logger.info('hive_federated_job_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async runOnce(): Promise<void> {
    try {
      await runFederatedHiveJob(DEFAULT_TENANT);
    } catch (error) {
      logger.warn('hive_federated_job_failed', { error: String(error) });
    }
  }
}

export const federatedHiveJob = new FederatedHiveJobScheduler();
