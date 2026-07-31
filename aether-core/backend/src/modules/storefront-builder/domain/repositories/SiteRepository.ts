import { BuildJob } from '../entities/BuildJob';
import { DeployTarget } from '../entities/DeployTarget';
import { SitePage } from '../entities/SitePage';
import { SiteProject } from '../entities/SiteProject';
import { SiteRevision } from '../entities/SiteRevision';

export interface UpsertDeployTargetInput {
  provider: string;
  liveUrl?: string | null;
  configJson?: unknown | null;
}

export interface CreateSiteProjectInput {
  slug: string;
  primaryDomain?: string | null;
  briefJson?: unknown;
  planJson?: unknown;
  createdByAgent?: string | null;
}

export interface CreateSiteProjectResult {
  project: SiteProject;
  revision: SiteRevision;
  buildJob: BuildJob;
}

export interface CreateRevisionInput {
  projectId: string;
  parentRevisionId?: string | null;
  briefJson?: unknown;
  planJson?: unknown;
  createdByAgent?: string | null;
}

export interface CreateRevisionResult {
  revision: SiteRevision;
  buildJob: BuildJob;
}

export interface AttachCompiledArtifactsInput {
  artifactsPath: string;
  pages: Array<{
    path: string;
    title: string;
    seoJson: unknown;
    treeJson: unknown;
    sortOrder: number;
  }>;
  /** Optional normalized plan written back after codegen. */
  planJson?: unknown;
  qaReportJson?: unknown;
}

export interface UpdateBuildJobInput {
  status?: string;
  logs?: string | null;
  previewUrl?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
}

/**
 * Outbound persistence port for storefront site projects, revisions, pages, builds.
 * Every method requires tenantId and must scope queries through the owning project.
 */
export interface SiteRepository {
  findProjectById(tenantId: string, projectId: string): Promise<SiteProject | null>;
  findProjectBySlug(tenantId: string, slug: string): Promise<SiteProject | null>;
  /**
   * Public storefront resolution by SiteProject.slug (no admin tenant header).
   * Prefer live projects when multiple tenants share a slug.
   */
  findProjectByPublicSlug(slug: string): Promise<SiteProject | null>;
  listProjects(tenantId: string): Promise<SiteProject[]>;
  createProjectWithInitialRevision(
    tenantId: string,
    input: CreateSiteProjectInput
  ): Promise<CreateSiteProjectResult>;

  findRevisionById(tenantId: string, revisionId: string): Promise<SiteRevision | null>;
  listRevisions(tenantId: string, projectId: string): Promise<SiteRevision[]>;
  createRevision(tenantId: string, input: CreateRevisionInput): Promise<CreateRevisionResult>;

  /**
   * Persist compiled pages + artifactsPath on a revision (tenant-scoped).
   * Replaces existing pages for the revision.
   */
  attachCompiledArtifacts(
    tenantId: string,
    revisionId: string,
    input: AttachCompiledArtifactsInput
  ): Promise<SiteRevision>;

  listPages(tenantId: string, revisionId: string): Promise<SitePage[]>;
  findPageById(tenantId: string, pageId: string): Promise<SitePage | null>;
  findPageByPath(tenantId: string, revisionId: string, path: string): Promise<SitePage | null>;

  createBuildJob(tenantId: string, revisionId: string): Promise<BuildJob>;
  findBuildJobById(tenantId: string, buildJobId: string): Promise<BuildJob | null>;
  updateBuildJob(
    tenantId: string,
    buildJobId: string,
    input: UpdateBuildJobInput
  ): Promise<BuildJob>;

  findDeployTarget(tenantId: string, projectId: string): Promise<DeployTarget | null>;
  upsertDeployTarget(
    tenantId: string,
    projectId: string,
    input: UpsertDeployTargetInput
  ): Promise<DeployTarget>;

  /**
   * Set status=live and liveRevisionId (StubDeployAdapter; Appendix G).
   * Tenant-scoped; throws if project/revision missing or revision not owned by project.
   */
  markProjectLive(
    tenantId: string,
    projectId: string,
    revisionId: string,
    opts?: { liveUrl?: string | null; provider?: string }
  ): Promise<SiteProject>;

  /** Live projects for organism health scans (tenant-scoped). */
  listLiveProjects(tenantId: string): Promise<SiteProject[]>;

  /**
   * Safe-mode demote: status=preview, clear liveRevisionId (never auto-archives).
   * Idempotent if already not live.
   */
  demoteProjectFromLive(
    tenantId: string,
    projectId: string,
    reason: string
  ): Promise<SiteProject>;

  /** Recent build jobs for a project (newest first), via owned revisions. */
  listRecentBuildJobsForProject(
    tenantId: string,
    projectId: string,
    take?: number
  ): Promise<BuildJob[]>;
}
