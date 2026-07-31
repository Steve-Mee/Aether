import { BuildJob } from '../domain/entities/BuildJob';
import { DeployTarget } from '../domain/entities/DeployTarget';
import { SitePage } from '../domain/entities/SitePage';
import { SiteProject } from '../domain/entities/SiteProject';
import { SiteRevision } from '../domain/entities/SiteRevision';

export function revisionApiStatus(revision: SiteRevision): string {
  return revision.artifactsPath ? 'ready' : 'generating';
}

export function mapProjectSummary(project: SiteProject) {
  return {
    id: project.id,
    tenantId: project.tenantId,
    slug: project.slug,
    status: project.status,
    primaryDomain: project.primaryDomain,
    liveRevisionId: project.liveRevisionId,
    createdAt: project.createdAt.toISOString(),
  };
}

export function mapProjectDetail(
  project: SiteProject,
  extras: {
    latestRevisionId?: string | null;
    latestPreviewUrl?: string | null;
    latestQaScore?: number | null;
  } = {}
) {
  return {
    id: project.id,
    slug: project.slug,
    status: project.status,
    primaryDomain: project.primaryDomain,
    liveRevisionId: project.liveRevisionId,
    latestRevisionId: extras.latestRevisionId ?? null,
    latestPreviewUrl: extras.latestPreviewUrl ?? null,
    latestQaScore: extras.latestQaScore ?? null,
  };
}

export function mapRevisionCreate(revision: SiteRevision) {
  return {
    id: revision.id,
    version: revision.version,
    status: revisionApiStatus(revision),
  };
}

export function mapRevisionListItem(
  revision: SiteRevision,
  previewUrl: string | null = null
) {
  const qaScore = extractQaScore(revision.qaReportJson);
  return {
    id: revision.id,
    version: revision.version,
    createdByAgent: revision.createdByAgent,
    qaScore,
    createdAt: revision.createdAt.toISOString(),
    previewUrl,
  };
}

export function mapRevisionDetail(
  revision: SiteRevision,
  pages: SitePage[],
  artifactKeys: string[] = []
) {
  return {
    id: revision.id,
    projectId: revision.projectId,
    version: revision.version,
    status: revisionApiStatus(revision),
    briefJson: revision.briefJson,
    planJson: revision.planJson,
    qaReportJson: revision.qaReportJson,
    createdByAgent: revision.createdByAgent,
    parentRevisionId: revision.parentRevisionId,
    createdAt: revision.createdAt.toISOString(),
    pages: pages.map((p) => ({ id: p.id, path: p.path, title: p.title })),
    artifactManifestKeys: artifactKeys,
  };
}

export function mapPageSummary(page: SitePage) {
  return { id: page.id, path: page.path, title: page.title };
}

export function mapPageDetail(page: SitePage) {
  return {
    id: page.id,
    path: page.path,
    title: page.title,
    seoJson: page.seoJson,
    treeJson: page.treeJson,
  };
}

export function mapBuildJobQueued(job: BuildJob) {
  return {
    id: job.id,
    status: job.status,
    ...(job.previewUrl != null ? { previewUrl: job.previewUrl } : {}),
  };
}

export function mapBuildJobDetail(job: BuildJob, qaReportJson: unknown = null) {
  return {
    id: job.id,
    revisionId: job.revisionId,
    status: job.status,
    previewUrl: job.previewUrl,
    logs: job.logs,
    qaReportJson,
  };
}

export function mapDeployTarget(target: DeployTarget) {
  return {
    provider: target.provider,
    liveUrl: target.liveUrl,
    configJson: target.configJson ?? {},
  };
}

export function extractQaScore(qaReportJson: unknown): number | null {
  if (
    qaReportJson &&
    typeof qaReportJson === 'object' &&
    qaReportJson !== null &&
    'score' in qaReportJson
  ) {
    const score = Number((qaReportJson as { score?: unknown }).score);
    return Number.isFinite(score) ? score : null;
  }
  return null;
}
