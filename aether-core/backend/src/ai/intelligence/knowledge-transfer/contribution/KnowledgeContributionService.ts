import type { CrossTenantSubmitPipeline } from '../../global-knowledge/federated/FederatedQueryUseCase';
import type { SecAggRoundService } from '../../global-knowledge/secure-aggregation/SecAggRoundService';
import { prisma } from '../../../../shared/prisma/client';
import { logger } from '../../../../shared/logging/logger';
import type { KnowledgeTransferPort, AnonymizedInsight } from '../KnowledgeTransferPort';
import {
  AgentRunContributionExtractor,
  type AgentRunContributionInput,
} from './AgentRunContributionExtractor';
import { extractReflectionInsights } from './ReflectionContributionExtractor';
import type { ExperienceReflection } from '../../personal-brain/reflection/types';
import type { ContributionGatePort } from './ContributionGatePort';
import {
  ContributionSafetyFilter,
  type ContributionSource,
} from './ContributionSafetyFilter';
import { mapToolToCategory } from './contributionTaxonomy';
import { metricFingerprint } from './contributionEligibility';

export interface ContributionResult {
  submitted: number;
  rejected: number;
  federatedUpserted?: number;
  notice?: string;
}

const CONTRIBUTION_NOTICE_NL =
  'Anonieme inzichten zijn gedeeld om AETHER slimmer te maken voor iedereen.';

export class KnowledgeContributionService {
  private extractor = new AgentRunContributionExtractor();
  private filter = new ContributionSafetyFilter();

  constructor(
    private knowledgeTransfer: KnowledgeTransferPort,
    private gate: ContributionGatePort,
    private federatedPipeline?: CrossTenantSubmitPipeline,
    private secAggRoundService?: SecAggRoundService
  ) {}

  async submitInsights(
    tenantId: string,
    insights: AnonymizedInsight[],
    source: ContributionSource = 'orchestrator'
  ): Promise<ContributionResult> {
    if (!(await this.gate.canContribute(tenantId))) {
      return { submitted: 0, rejected: insights.length };
    }

    const { accepted, rejected } = this.filter.filter(insights);
    await this.logBatch(tenantId, source, accepted, rejected);

    if (accepted.length === 0) {
      return { submitted: 0, rejected: rejected.length };
    }

    const result = await this.knowledgeTransfer.submitAnonymizedInsights(tenantId, accepted);
    const federatedUpserted = await this.maybeFederate(tenantId, accepted);

    return {
      submitted: result.count,
      rejected: rejected.length,
      federatedUpserted,
      notice: result.count > 0 ? CONTRIBUTION_NOTICE_NL : undefined,
    };
  }

  async contributeFromAgentRun(
    tenantId: string,
    input: AgentRunContributionInput
  ): Promise<ContributionResult> {
    const insights = this.extractor.extract(input);
    return this.submitInsights(tenantId, insights, 'agent_run');
  }

  async contributeFromReflection(
    tenantId: string,
    reflection: ExperienceReflection
  ): Promise<ContributionResult> {
    const insights = extractReflectionInsights(reflection);
    return this.submitInsights(tenantId, insights, 'agent_run');
  }

  async contributeFromToolOutcome(
    tenantId: string,
    params: { tool: string; approved: boolean; risk: string }
  ): Promise<ContributionResult> {
    void params.risk;
    const category = mapToolToCategory(params.tool);
    const metric = params.approved
      ? `${params.tool}_tool_approval_rate`
      : `${params.tool}_tool_rejection_rate`;
    const value = params.approved ? 1 : 0;

    return this.submitInsights(
      tenantId,
      [{ category, metric, value, sampleSize: 1 }],
      'tool_outcome'
    );
  }

  /** Batch recent accepted logs per category:metric; dedup within window. */
  async contributeFromRecentLogs(tenantId: string, limit = 100): Promise<ContributionResult> {
    if (!(await this.gate.canContribute(tenantId))) {
      return { submitted: 0, rejected: 0 };
    }

    const dedupWindowMs = Number(process.env.KNOWLEDGE_CONTRIBUTE_DEDUP_WINDOW_MS ?? 86400000);
    const since = new Date(Date.now() - dedupWindowMs);

    const logs = await prisma.brainKnowledgeContributionLog.findMany({
      where: { tenantId, submitted: true, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    if (logs.length === 0) {
      return { submitted: 0, rejected: 0 };
    }

    const lastOrchestratorSubmit = await prisma.brainKnowledgeContributionLog.findFirst({
      where: {
        tenantId,
        source: 'orchestrator',
        submitted: true,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastOrchestratorSubmit && Date.now() - lastOrchestratorSubmit.createdAt.getTime() < dedupWindowMs) {
      return { submitted: 0, rejected: 0 };
    }

    const buckets = new Map<string, { category: string; metric: string; count: number }>();
    for (const log of logs) {
      const key = `${log.category}:${log.metric}`;
      const bucket = buckets.get(key) ?? { category: log.category, metric: log.metric, count: 0 };
      bucket.count += log.sampleSize;
      buckets.set(key, bucket);
    }

    const insights: AnonymizedInsight[] = [...buckets.values()].map((b) => ({
      category: b.category,
      metric: b.metric,
      value: 1,
      sampleSize: b.count,
    }));

    return this.submitInsights(tenantId, insights, 'orchestrator');
  }

  private async maybeFederate(
    tenantId: string,
    accepted: AnonymizedInsight[]
  ): Promise<number | undefined> {
    if (!(await this.gate.shouldFederate(tenantId))) {
      return undefined;
    }

    if (process.env.INTELLIGENCE_SECAGG_ENABLED === 'true' && this.secAggRoundService) {
      try {
        for (const insight of accepted) {
          await this.secAggRoundService.enqueueMaskedUpdate({
            tenantId,
            category: insight.category,
            metric: insight.metric,
            value: insight.value,
          });
        }
        if (process.env.INTELLIGENCE_AUTO_FEDERATE_ON_CONTRIBUTE === 'true') {
          return await this.secAggRoundService.finalizeReadyRounds();
        }
        return accepted.length;
      } catch (error) {
        logger.warn('knowledge_contribution_secagg_failed', {
          tenantId,
          error: error instanceof Error ? error.message : String(error),
        });
        return undefined;
      }
    }

    if (
      process.env.INTELLIGENCE_AUTO_FEDERATE_ON_CONTRIBUTE !== 'true' ||
      !this.federatedPipeline
    ) {
      return undefined;
    }

    try {
      return await this.federatedPipeline.refreshFromTenantInsights();
    } catch (error) {
      logger.warn('knowledge_contribution_federate_failed', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  private async logBatch(
    tenantId: string,
    source: ContributionSource,
    accepted: AnonymizedInsight[],
    rejected: Array<{ insight: AnonymizedInsight; rejectReason?: string }>
  ): Promise<void> {
    const rows = [
      ...accepted.map((i) => ({
        tenantId,
        source,
        category: i.category,
        metric: i.metric,
        metricFingerprint: metricFingerprint(i.category, i.metric),
        sampleSize: i.sampleSize ?? 1,
        submitted: true,
        rejectReason: null as string | null,
      })),
      ...rejected.map((r) => ({
        tenantId,
        source,
        category: r.insight.category,
        metric: r.insight.metric,
        metricFingerprint: metricFingerprint(r.insight.category, r.insight.metric),
        sampleSize: r.insight.sampleSize ?? 1,
        submitted: false,
        rejectReason: r.rejectReason ?? 'rejected',
      })),
    ];

    if (rows.length === 0) return;

    try {
      await prisma.brainKnowledgeContributionLog.createMany({ data: rows });
    } catch (error) {
      logger.warn('knowledge_contribution_log_failed', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
