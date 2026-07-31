import axios from 'axios';
import { createApp, VERSION } from './app';
import { disconnectPrisma } from './shared/prisma/client';
import { logger } from './shared/logging/logger';
import { initOtelSdk, shutdownOtelSdk } from './shared/observability/otelBootstrap';
import { initSentry, shutdownSentry } from './shared/observability/sentry';
import { imapPollingService } from './modules/aether-mail/infrastructure/imap/ImapPollingService';
import { monitorSupplierJob } from './modules/supplier-intelligence/infrastructure/jobs/MonitorSupplierJob';
import { monitorLowStockJob } from './modules/inventory-pricing/infrastructure/jobs/MonitorLowStockJob';
import { proactiveBrainJob } from './ai/intelligence/proactive/ProactiveBrainJob';
import { goalProgressJob } from './ai/intelligence/goals/jobs/GoalProgressJob';
import { getCompositionRoot, processEventOutbox } from './bootstrap/compositionRoot';
import { goalSuggestionJob } from './ai/intelligence/goals/jobs/GoalSuggestionJob';
import { goalPatternDistillJob } from './ai/intelligence/goals/federated/jobs/GoalPatternDistillJob';
import { proactiveEnrichmentJob } from './ai/intelligence/proactive/jobs/ProactiveEnrichmentJob';
import { explainabilityNarrativeJob } from './ai/intelligence/explainability/jobs/ExplainabilityNarrativeJob';
import { explainabilityPatternDistillJob } from './ai/intelligence/explainability/jobs/ExplainabilityPatternDistillJob';
import {
  knowledgeContributionJob,
  knowledgeDistillJob,
  knowledgeFederateJob,
} from './ai/intelligence/knowledge-transfer/jobs/KnowledgeContributionJob';
import { federatedHiveJob } from './modules/zero-knowledge-hive-mind/infrastructure/jobs/FederatedHiveJobScheduler';
import { getOperatingMetrics } from './shared/truth/operatingMetricsService';
import { startOutboxRelayInterval } from './shared/messaging/OutboxRelayService';
import { resolveOutboxRelayPollMs, isExternalBrokerEnabled } from './shared/messaging/messagingConfig';
import {
  pollPendingPeerJobs,
  resolvePeerJobPollMs,
} from './ai/intelligence/multi-agent/peer/jobs/peerJobKafkaConfig';
import { getAgentPeerJobWorker } from './ai/intelligence/multi-agent/peer/jobs/AgentPeerJobWorker';
import { PrismaAgentPeerJobAdapter } from './ai/intelligence/multi-agent/peer/jobs/PrismaAgentPeerJobAdapter';
import { createAgentPatternContributionJob } from './ai/intelligence/global-knowledge/agent-patterns/AgentPatternContributionJob';
import { storefrontOrganismJob } from './modules/storefront-builder/infrastructure/jobs/StorefrontOrganismJob';
import { redisMemoryGovernor } from './shared/redis/RedisMemoryGovernor';

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
    if (isExternalBrokerEnabled()) {
      startOutboxRelayInterval(resolveOutboxRelayPollMs(), 'api');
    }
    const peerWorker = getAgentPeerJobWorker();
    if (peerWorker) {
      const jobPort = new PrismaAgentPeerJobAdapter();
      setInterval(() => {
        void pollPendingPeerJobs(jobPort, (id, tenantId) =>
          peerWorker.processJob(id, tenantId)
        );
      }, resolvePeerJobPollMs());
    }
    void imapPollingService.start();
    monitorSupplierJob.start();
    monitorLowStockJob.start();
    proactiveBrainJob.start();
    goalProgressJob.start();
    void getCompositionRoot().overviewFeedBackfillJob.runOnce();
    void getCompositionRoot().notificationBackfillJob.runAll();
    getCompositionRoot().notificationDigestJob.start();
    goalSuggestionJob.start();
    goalPatternDistillJob.start();
    proactiveEnrichmentJob.start();
    explainabilityNarrativeJob.start();
    explainabilityPatternDistillJob.start();
    knowledgeContributionJob.start();
    knowledgeDistillJob.start();
    knowledgeFederateJob.start();
    getCompositionRoot().memoryConsolidationJob.start();
    getCompositionRoot().runMemoryGcJob?.start();
    const agentPatternJob = createAgentPatternContributionJob(
      getCompositionRoot().agentPatternSync
    );
    agentPatternJob.start();
    storefrontOrganismJob.start();
    redisMemoryGovernor.start();
    void maybeStartEcosystemJobs();
  });

  process.on('SIGTERM', async () => {
    imapPollingService.stop();
    monitorSupplierJob.stop();
    monitorLowStockJob.stop();
    storefrontOrganismJob.stop();
    redisMemoryGovernor.stop();
    knowledgeContributionJob.stop();
    knowledgeDistillJob.stop();
    knowledgeFederateJob.stop();
    getCompositionRoot().memoryConsolidationJob.stop();
    getCompositionRoot().runMemoryGcJob?.stop();
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
