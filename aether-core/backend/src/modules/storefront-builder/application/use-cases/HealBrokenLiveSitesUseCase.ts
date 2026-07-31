import { eventBus } from '../../../../shared/events/eventBus';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { logger } from '../../../../shared/logging/logger';
import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { StartBuildUseCase } from './StartBuildUseCase';
import { isStorefrontOrganismEnabled } from '../services/storefrontOrganismConfig';

export type HealAction = 'healed' | 'demoted' | 'skipped' | 'healthy';

export interface HealBrokenLiveResult {
  projectId: string;
  slug: string;
  action: HealAction;
  detail: string;
}

/**
 * Dead-man self-heal for live sites without artifacts:
 * 1) rebuild live revision in place (no human restart)
 * 2) if rebuild fails → safe demote to preview + clear liveRevisionId
 * Never auto-publishes a new revision.
 */
export class HealBrokenLiveSitesUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly startSiteBuild: StartBuildUseCase
  ) {}

  async execute(tenantId: string): Promise<HealBrokenLiveResult[]> {
    const tid = requireTenantId(tenantId, 'HealBrokenLiveSitesUseCase.execute');
    if (!isStorefrontOrganismEnabled()) {
      return [];
    }
    const live = await this.siteRepository.listLiveProjects(tid);
    const results: HealBrokenLiveResult[] = [];

    for (const project of live) {
      if (!project.liveRevisionId) {
        const demoted = await this.siteRepository.demoteProjectFromLive(
          tid,
          project.id,
          'live_without_revision_pointer'
        );
        await this.emitDemoted(tid, demoted.id, demoted.slug, 'live_without_revision_pointer');
        results.push({
          projectId: project.id,
          slug: project.slug,
          action: 'demoted',
          detail: 'live_without_revision_pointer',
        });
        continue;
      }

      const revision = await this.siteRepository.findRevisionById(tid, project.liveRevisionId);
      if (!revision || revision.projectId !== project.id) {
        const demoted = await this.siteRepository.demoteProjectFromLive(
          tid,
          project.id,
          'dangling_live_revision'
        );
        await this.emitDemoted(tid, demoted.id, demoted.slug, 'dangling_live_revision');
        results.push({
          projectId: project.id,
          slug: project.slug,
          action: 'demoted',
          detail: 'dangling_live_revision',
        });
        continue;
      }

      if (revision.artifactsPath?.trim()) {
        results.push({
          projectId: project.id,
          slug: project.slug,
          action: 'healthy',
          detail: 'artifacts_present',
        });
        continue;
      }

      try {
        await this.startSiteBuild.execute(tid, revision.id);
        const after = await this.siteRepository.findRevisionById(tid, revision.id);
        if (after?.artifactsPath?.trim()) {
          await eventBus.publish({
            tenantId: tid,
            type: 'website.health.healed',
            payload: {
              projectId: project.id,
              slug: project.slug,
              revisionId: revision.id,
              reason: 'rebuilt_missing_artifacts',
            },
            idempotencyKey: `website.health.healed:${project.id}:${revision.id}:rebuild`,
          });
          results.push({
            projectId: project.id,
            slug: project.slug,
            action: 'healed',
            detail: 'rebuilt_missing_artifacts',
          });
          continue;
        }
      } catch (err) {
        logger.warn('storefront_organism_heal_rebuild_failed', {
          tenantId: tid,
          projectId: project.id,
          revisionId: revision.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      const demoted = await this.siteRepository.demoteProjectFromLive(
        tid,
        project.id,
        'missing_artifacts_rebuild_failed'
      );
      await this.emitDemoted(tid, demoted.id, demoted.slug, 'missing_artifacts_rebuild_failed');
      results.push({
        projectId: project.id,
        slug: project.slug,
        action: 'demoted',
        detail: 'missing_artifacts_rebuild_failed',
      });
    }

    return results;
  }

  private async emitDemoted(
    tenantId: string,
    projectId: string,
    slug: string,
    reason: string
  ): Promise<void> {
    await eventBus.publish({
      tenantId,
      type: 'website.health.demoted',
      payload: { projectId, slug, reason },
      idempotencyKey: `website.health.demoted:${projectId}:${reason}`,
    });
  }
}
