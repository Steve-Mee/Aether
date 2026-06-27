import axios from 'axios';
import { createApp, VERSION } from './app';
import { disconnectPrisma } from './shared/prisma/client';
import { logger } from './shared/logging/logger';
import { initOtelSdk, shutdownOtelSdk } from './shared/observability/otelBootstrap';
import { initSentry, shutdownSentry } from './shared/observability/sentry';
import { imapPollingService } from './modules/aether-mail/infrastructure/imap/ImapPollingService';
import { monitorSupplierJob } from './modules/supplier-intelligence/infrastructure/jobs/MonitorSupplierJob';
import {
  knowledgeContributionJob,
  knowledgeDistillJob,
  knowledgeFederateJob,
} from './ai/intelligence/knowledge-transfer/jobs/KnowledgeContributionJob';
import { federatedHiveJob } from './modules/zero-knowledge-hive-mind/infrastructure/jobs/FederatedHiveJobScheduler';
import { getOperatingMetrics } from './shared/truth/operatingMetricsService';
import { processEventOutbox, getCompositionRoot } from './bootstrap/compositionRoot';

const PORT = process.env.PORT || 9000;
const DEFAULT_TENANT = process.env.AETHER_DEFAULT_TENANT ?? 'tenant_default';

initSentry();
initOtelSdk();

async function assertOllamaReachable(): Promise<void> {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  if (!baseUrl) return;
  try {
    const response = await axios.get(`${baseUrl.replace(/\/$/, '')}/api/tags`, { timeout: 10000 });
    logger.info('ollama_health_ok', { models: response.data?.models?.length ?? 0, baseUrl });
  } catch (error) {
    logger.error('ollama_health_failed', {
      baseUrl,
      message: error instanceof Error ? error.message : String(error),
      hint: 'Ensure ollama service is running on the internal docker network',
    });
    if (process.env.NODE_ENV === 'production' || process.env.REQUIRE_OLLAMA === 'true') {
      process.exit(1);
    }
  }
}

async function maybeStartEcosystemJobs(): Promise<void> {
  if (process.env.ECOSYSTEM_JOBS_ENABLED !== 'true') {
    logger.info('ecosystem_jobs_skipped', {
      reason: 'Set ECOSYSTEM_JOBS_ENABLED=true after core reliability gates pass',
    });
    return;
  }

  try {
    const metrics = await getOperatingMetrics(DEFAULT_TENANT);
    if (metrics.tenantSafetyScore >= 0.99 && metrics.rollbackSuccessRate >= 0.95) {
      federatedHiveJob.start();
      logger.info('ecosystem_jobs_started', {
        jobs: ['federatedHiveJob'],
        tenantSafetyScore: metrics.tenantSafetyScore,
        rollbackSuccessRate: metrics.rollbackSuccessRate,
      });
    } else {
      logger.warn('ecosystem_jobs_blocked_by_metrics', {
        tenantSafetyScore: metrics.tenantSafetyScore,
        rollbackSuccessRate: metrics.rollbackSuccessRate,
        required: { tenantSafetyScore: 0.99, rollbackSuccessRate: 0.95 },
      });
    }
  } catch (error) {
    logger.error('ecosystem_jobs_metrics_check_failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function startServer(): Promise<void> {
  await assertOllamaReachable();
  const app = createApp();

  const server = app.listen(PORT, () => {
    logger.info('aether_core_started', { port: PORT, version: VERSION });
    void processEventOutbox().then((count) => {
      if (count > 0) logger.info('event_outbox_replayed', { count });
    });
    void imapPollingService.start();
    monitorSupplierJob.start();
    knowledgeContributionJob.start();
    knowledgeDistillJob.start();
    knowledgeFederateJob.start();
    getCompositionRoot().memoryConsolidationJob.start();
    void maybeStartEcosystemJobs();
  });

  process.on('SIGTERM', async () => {
    imapPollingService.stop();
    monitorSupplierJob.stop();
    knowledgeContributionJob.stop();
    knowledgeDistillJob.stop();
    knowledgeFederateJob.stop();
    getCompositionRoot().memoryConsolidationJob.stop();
    federatedHiveJob.stop();
    server.close(async () => {
      await shutdownOtelSdk();
      await shutdownSentry();
      await disconnectPrisma();
      process.exit(0);
    });
  });
}

void startServer();

export {};
