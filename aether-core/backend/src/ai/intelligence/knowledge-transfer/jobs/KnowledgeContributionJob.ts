import { logger } from '../../../../shared/logging/logger';
import { orchestrator } from '../../../orchestrator/Orchestrator';
import { findEligibleContributionTenants } from '../contribution/contributionEligibility';
import { withServerSpan } from '../../../../shared/observability/sentry';

export class KnowledgeContributionJob {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (process.env.KNOWLEDGE_CONTRIBUTE_JOB_ENABLED !== 'true') {
      logger.info('knowledge_contribute_job_disabled');
      return;
    }
    const intervalMs = parseInt(process.env.KNOWLEDGE_CONTRIBUTE_INTERVAL_MS ?? '86400000', 10);
    void this.runAll();
    this.timer = setInterval(() => void this.runAll(), intervalMs);
    logger.info('knowledge_contribute_job_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runAll(): Promise<void> {
    const tenants = await findEligibleContributionTenants();
    for (const tenantId of tenants) {
      try {
        await withServerSpan('knowledge.contribute', { tenantId }, () =>
          orchestrator.execute({
            tenantId,
            task: 'knowledge.contribute',
            input: { trigger: 'scheduler' },
            actorId: 'scheduler',
          })
        );
      } catch (error) {
        logger.warn('knowledge_contribute_job_failed', { tenantId, error: String(error) });
      }
    }
  }
}

export class KnowledgeDistillJob {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (process.env.KNOWLEDGE_DISTILL_JOB_ENABLED !== 'true') return;
    const intervalMs = parseInt(process.env.KNOWLEDGE_CONTRIBUTE_INTERVAL_MS ?? '86400000', 10);
    void this.runAll();
    this.timer = setInterval(() => void this.runAll(), intervalMs);
    logger.info('knowledge_distill_job_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runAll(): Promise<void> {
    const tenants = await findEligibleContributionTenants();
    for (const tenantId of tenants) {
      try {
        await orchestrator.execute({
          tenantId,
          task: 'knowledge.distill',
          input: { trigger: 'scheduler' },
          actorId: 'scheduler',
        });
      } catch (error) {
        logger.warn('knowledge_distill_job_failed', { tenantId, error: String(error) });
      }
    }
  }
}

export class KnowledgeFederateJob {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (process.env.KNOWLEDGE_FEDERATE_JOB_ENABLED !== 'true') return;
    const intervalMs = parseInt(process.env.KNOWLEDGE_CONTRIBUTE_INTERVAL_MS ?? '86400000', 10);
    void this.runAll();
    this.timer = setInterval(() => void this.runAll(), intervalMs);
    logger.info('knowledge_federate_job_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runAll(): Promise<void> {
    try {
      await orchestrator.execute({
        tenantId: 'system',
        task: 'knowledge.federate',
        input: { trigger: 'scheduler' },
        actorId: 'scheduler',
      });
    } catch (error) {
      logger.warn('knowledge_federate_job_failed', { error: String(error) });
    }
  }
}

export const knowledgeContributionJob = new KnowledgeContributionJob();
export const knowledgeDistillJob = new KnowledgeDistillJob();
export const knowledgeFederateJob = new KnowledgeFederateJob();
