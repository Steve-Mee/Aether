import { PrismaClient } from '@prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { BuildJob } from '../../domain/entities/BuildJob';
import { DeployTarget } from '../../domain/entities/DeployTarget';
import { SitePage } from '../../domain/entities/SitePage';
import { SiteProject } from '../../domain/entities/SiteProject';
import { SiteRevision } from '../../domain/entities/SiteRevision';
import {
  AttachCompiledArtifactsInput,
  CreateRevisionInput,
  CreateRevisionResult,
  CreateSiteProjectInput,
  CreateSiteProjectResult,
  SiteRepository,
  UpdateBuildJobInput,
  UpsertDeployTargetInput,
} from '../../domain/repositories/SiteRepository';
import * as buildJobOps from './siteRepo/siteBuildJobOps';
import * as deployOps from './siteRepo/siteDeployOps';
import * as pageOps from './siteRepo/sitePageOps';
import * as projectMutations from './siteRepo/siteProjectMutations';
import * as projectQueries from './siteRepo/siteProjectQueries';
import * as revisionOps from './siteRepo/siteRevisionOps';

export class PrismaSiteRepository implements SiteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findProjectById(tenantId: string, projectId: string): Promise<SiteProject | null> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.findProjectById');
    return projectQueries.findProjectById(this.prisma, tid, projectId);
  }

  async findProjectBySlug(tenantId: string, slug: string): Promise<SiteProject | null> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.findProjectBySlug');
    return projectQueries.findProjectBySlug(this.prisma, tid, slug);
  }

  async findProjectByPublicSlug(slug: string): Promise<SiteProject | null> {
    return projectQueries.findProjectByPublicSlug(this.prisma, slug);
  }

  async listProjects(tenantId: string): Promise<SiteProject[]> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.listProjects');
    return projectQueries.listProjects(this.prisma, tid);
  }

  async createProjectWithInitialRevision(
    tenantId: string,
    input: CreateSiteProjectInput
  ): Promise<CreateSiteProjectResult> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.createProjectWithInitialRevision');
    return projectMutations.createProjectWithInitialRevision(this.prisma, tid, input);
  }

  async findRevisionById(tenantId: string, revisionId: string): Promise<SiteRevision | null> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.findRevisionById');
    return revisionOps.findRevisionById(this.prisma, tid, revisionId);
  }

  async listRevisions(tenantId: string, projectId: string): Promise<SiteRevision[]> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.listRevisions');
    return revisionOps.listRevisions(this.prisma, tid, projectId);
  }

  async createRevision(tenantId: string, input: CreateRevisionInput): Promise<CreateRevisionResult> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.createRevision');
    return revisionOps.createRevision(this.prisma, tid, input);
  }

  async attachCompiledArtifacts(
    tenantId: string,
    revisionId: string,
    input: AttachCompiledArtifactsInput
  ): Promise<SiteRevision> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.attachCompiledArtifacts');
    return revisionOps.attachCompiledArtifacts(this.prisma, tid, revisionId, input);
  }

  async listPages(tenantId: string, revisionId: string): Promise<SitePage[]> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.listPages');
    return pageOps.listPages(this.prisma, tid, revisionId);
  }

  async findPageById(tenantId: string, pageId: string): Promise<SitePage | null> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.findPageById');
    return pageOps.findPageById(this.prisma, tid, pageId);
  }

  async findPageByPath(
    tenantId: string,
    revisionId: string,
    path: string
  ): Promise<SitePage | null> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.findPageByPath');
    return pageOps.findPageByPath(this.prisma, tid, revisionId, path);
  }

  async createBuildJob(tenantId: string, revisionId: string): Promise<BuildJob> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.createBuildJob');
    return buildJobOps.createBuildJob(this.prisma, tid, revisionId);
  }

  async findBuildJobById(tenantId: string, buildJobId: string): Promise<BuildJob | null> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.findBuildJobById');
    return buildJobOps.findBuildJobById(this.prisma, tid, buildJobId);
  }

  async updateBuildJob(
    tenantId: string,
    buildJobId: string,
    input: UpdateBuildJobInput
  ): Promise<BuildJob> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.updateBuildJob');
    return buildJobOps.updateBuildJob(this.prisma, tid, buildJobId, input);
  }

  async findDeployTarget(tenantId: string, projectId: string): Promise<DeployTarget | null> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.findDeployTarget');
    return deployOps.findDeployTarget(this.prisma, tid, projectId);
  }

  async upsertDeployTarget(
    tenantId: string,
    projectId: string,
    input: UpsertDeployTargetInput
  ): Promise<DeployTarget> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.upsertDeployTarget');
    return deployOps.upsertDeployTarget(this.prisma, tid, projectId, input);
  }

  async markProjectLive(
    tenantId: string,
    projectId: string,
    revisionId: string,
    opts?: { liveUrl?: string | null; provider?: string }
  ): Promise<SiteProject> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.markProjectLive');
    return projectMutations.markProjectLive(this.prisma, tid, projectId, revisionId, opts);
  }

  async listLiveProjects(tenantId: string): Promise<SiteProject[]> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.listLiveProjects');
    return projectQueries.listLiveProjects(this.prisma, tid);
  }

  async demoteProjectFromLive(
    tenantId: string,
    projectId: string,
    reason: string
  ): Promise<SiteProject> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.demoteProjectFromLive');
    return projectMutations.demoteProjectFromLive(this.prisma, tid, projectId, reason);
  }

  async listRecentBuildJobsForProject(
    tenantId: string,
    projectId: string,
    take = 10
  ): Promise<BuildJob[]> {
    const tid = requireTenantId(tenantId, 'PrismaSiteRepository.listRecentBuildJobsForProject');
    return buildJobOps.listRecentBuildJobsForProject(this.prisma, tid, projectId, take);
  }
}
