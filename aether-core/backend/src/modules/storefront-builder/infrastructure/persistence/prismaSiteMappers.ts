import { Prisma } from '@prisma/client';
import { BuildJob } from '../../domain/entities/BuildJob';
import { DeployTarget } from '../../domain/entities/DeployTarget';
import { SitePage } from '../../domain/entities/SitePage';
import { SiteProject } from '../../domain/entities/SiteProject';
import { SiteRevision } from '../../domain/entities/SiteRevision';

export type PrismaSiteProjectRow = {
  id: string;
  tenantId: string;
  slug: string;
  primaryDomain: string | null;
  status: string;
  liveRevisionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PrismaSiteRevisionRow = {
  id: string;
  projectId: string;
  version: number;
  briefJson: Prisma.JsonValue;
  planJson: Prisma.JsonValue;
  artifactsPath: string | null;
  qaReportJson: Prisma.JsonValue | null;
  createdByAgent: string | null;
  parentRevisionId: string | null;
  createdAt: Date;
};

export type PrismaSitePageRow = {
  id: string;
  revisionId: string;
  path: string;
  title: string;
  seoJson: Prisma.JsonValue;
  treeJson: Prisma.JsonValue;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PrismaBuildJobRow = {
  id: string;
  revisionId: string;
  status: string;
  logs: string | null;
  previewUrl: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
};

export type PrismaDeployTargetRow = {
  id: string;
  projectId: string;
  provider: string;
  liveUrl: string | null;
  configJson: Prisma.JsonValue | null;
  lastDeployedRevisionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toSiteProject(row: PrismaSiteProjectRow): SiteProject {
  return new SiteProject(
    row.id,
    row.tenantId,
    row.slug,
    row.primaryDomain,
    row.status,
    row.liveRevisionId,
    row.createdAt,
    row.updatedAt
  );
}

export function toSiteRevision(row: PrismaSiteRevisionRow): SiteRevision {
  return new SiteRevision(
    row.id,
    row.projectId,
    row.version,
    row.briefJson,
    row.planJson,
    row.artifactsPath,
    row.qaReportJson,
    row.createdByAgent,
    row.parentRevisionId,
    row.createdAt
  );
}

export function toSitePage(row: PrismaSitePageRow): SitePage {
  return new SitePage(
    row.id,
    row.revisionId,
    row.path,
    row.title,
    row.seoJson,
    row.treeJson,
    row.sortOrder,
    row.createdAt,
    row.updatedAt
  );
}

export function toBuildJob(row: PrismaBuildJobRow): BuildJob {
  return new BuildJob(
    row.id,
    row.revisionId,
    row.status,
    row.logs,
    row.previewUrl,
    row.startedAt,
    row.finishedAt,
    row.createdAt
  );
}

export function toDeployTarget(row: PrismaDeployTargetRow): DeployTarget {
  return new DeployTarget(
    row.id,
    row.projectId,
    row.provider,
    row.liveUrl,
    row.configJson,
    row.lastDeployedRevisionId,
    row.createdAt,
    row.updatedAt
  );
}
