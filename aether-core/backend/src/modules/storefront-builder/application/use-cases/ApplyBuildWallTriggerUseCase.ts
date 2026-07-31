import { eventBus } from '../../../../shared/events/eventBus';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { logger } from '../../../../shared/logging/logger';
import { buildFallbackSitePlan } from '../../../../ai/intelligence/multi-agent/agents/storefrontPlanFallback';
import type { ProactiveFinding } from '../../../../ai/intelligence/proactive/ProactiveTriggerDefinition';
import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { CreateRevisionUseCase } from './CreateRevisionUseCase';
import { StartBuildUseCase } from './StartBuildUseCase';
import {
  isStorefrontOrganismEnabled,
  resolveBuildWallFailureThreshold,
} from '../services/storefrontOrganismConfig';

export const STOREFRONT_WALL_HEAL_AGENT = 'storefront_organism_wall_heal';

export interface StorefrontWallSuggestPort {
  upsertFinding(tenantId: string, finding: ProactiveFinding, cooldownMs: number): Promise<unknown>;
}

export interface ApplyBuildWallResult {
  triggered: boolean;
  consecutiveFailures: number;
  selfHeal?: { revisionId: string; buildSucceeded: boolean };
  skippedSelfHeal?: boolean;
}

/**
 * Wall trigger: N consecutive build failures → event + STORE_ITERATE suggestion +
 * one autonomous Appendix-H revision rebuild (never publishes).
 */
export class ApplyBuildWallTriggerUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly createRevision: CreateRevisionUseCase,
    private readonly startSiteBuild: StartBuildUseCase,
    private readonly suggest?: StorefrontWallSuggestPort | null
  ) {}

  async execute(
    tenantId: string,
    projectId: string,
    opts: { buildJobId?: string; status?: string } = {}
  ): Promise<ApplyBuildWallResult> {
    const tid = requireTenantId(tenantId, 'ApplyBuildWallTriggerUseCase.execute');
    if (!isStorefrontOrganismEnabled()) {
      return { triggered: false, consecutiveFailures: 0 };
    }
    if (opts.status && opts.status !== 'failed') {
      return { triggered: false, consecutiveFailures: 0 };
    }

    const project = await this.siteRepository.findProjectById(tid, projectId);
    if (!project) {
      return { triggered: false, consecutiveFailures: 0 };
    }

    const threshold = resolveBuildWallFailureThreshold();
    const jobs = await this.siteRepository.listRecentBuildJobsForProject(tid, projectId, threshold);
    let consecutive = 0;
    for (const job of jobs) {
      if (job.status === 'failed') consecutive += 1;
      else break;
    }

    if (consecutive < threshold) {
      return { triggered: false, consecutiveFailures: consecutive };
    }

    await eventBus.publish({
      tenantId: tid,
      type: 'website.build.wall_triggered',
      payload: {
        projectId,
        slug: project.slug,
        consecutiveFailures: consecutive,
        threshold,
        buildJobId: opts.buildJobId ?? null,
      },
      idempotencyKey: `website.build.wall_triggered:${projectId}:${jobs[0]?.id ?? 'none'}`,
    });

    if (this.suggest) {
      try {
        await this.suggest.upsertFinding(
          tid,
          {
            triggerId: 'storefront_build_wall',
            dedupeKey: `storefront_build_wall:${projectId}`,
            agentKey: 'store_builder',
            title: `Website build wall: ${project.slug}`,
            summary: `${consecutive} consecutive build failures. Iterate the storefront brief or accept the autonomous heal revision.`,
            command: `itereer website ${project.slug}`,
            intentId: 'STORE_ITERATE',
            category: 'storefront',
            riskLevel: 'medium',
            executionMode: 'inform_only',
            priority: 2,
            evidence: { projectId, slug: project.slug, consecutiveFailures: consecutive },
          },
          60 * 60 * 1000
        );
      } catch (err) {
        logger.warn('storefront_organism_wall_suggest_failed', {
          tenantId: tid,
          projectId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const latest = (await this.siteRepository.listRevisions(tid, projectId))[0];
    // Avoid heal→fail→wall→heal loops: one autonomous Appendix-H attempt until merchant iterates.
    if (latest?.createdByAgent === STOREFRONT_WALL_HEAL_AGENT) {
      return {
        triggered: true,
        consecutiveFailures: consecutive,
        skippedSelfHeal: true,
      };
    }

    let selfHeal: ApplyBuildWallResult['selfHeal'];
    try {
      const brief = latest?.briefJson ?? { prompt: `Heal ${project.slug}` };
      const plan = buildFallbackSitePlan(brief);
      const { revision } = await this.createRevision.execute(tid, projectId, {
        parentRevisionId: latest?.id ?? null,
        brief,
        plan,
        createdByAgent: STOREFRONT_WALL_HEAL_AGENT,
      });
      try {
        await this.startSiteBuild.execute(tid, revision.id);
        selfHeal = { revisionId: revision.id, buildSucceeded: true };
      } catch {
        selfHeal = { revisionId: revision.id, buildSucceeded: false };
      }
      await eventBus.publish({
        tenantId: tid,
        type: 'website.health.healed',
        payload: {
          projectId,
          slug: project.slug,
          revisionId: revision.id,
          reason: 'wall_trigger_appendix_h_rebuild',
          buildSucceeded: selfHeal.buildSucceeded,
          published: false,
        },
        idempotencyKey: `website.health.healed:wall:${projectId}:${revision.id}`,
      });
    } catch (err) {
      logger.warn('storefront_organism_wall_self_heal_failed', {
        tenantId: tid,
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return { triggered: true, consecutiveFailures: consecutive, selfHeal };
  }
}
