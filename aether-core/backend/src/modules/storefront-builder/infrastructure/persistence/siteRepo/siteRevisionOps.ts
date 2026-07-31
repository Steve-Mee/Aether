import { Prisma, PrismaClient } from '@prisma/client';
import { SiteRevision } from '../../../domain/entities/SiteRevision';
import {
  AttachCompiledArtifactsInput,
  CreateRevisionInput,
  CreateRevisionResult,
} from '../../../domain/repositories/SiteRepository';
import { toBuildJob, toSiteRevision } from '../prismaSiteMappers';
import { asInputJson, requireOwnedProject } from '../prismaSiteRepoHelpers';

export async function findRevisionById(
  prisma: PrismaClient,
  tid: string,
  revisionId: string
): Promise<SiteRevision | null> {
  const row = await prisma.siteRevision.findFirst({
    where: { id: revisionId, project: { tenantId: tid } },
  });
  return row ? toSiteRevision(row) : null;
}

export async function listRevisions(
  prisma: PrismaClient,
  tid: string,
  projectId: string
): Promise<SiteRevision[]> {
  const rows = await prisma.siteRevision.findMany({
    where: { projectId, project: { tenantId: tid } },
    orderBy: { version: 'desc' },
  });
  return rows.map((r) => toSiteRevision(r));
}

export async function createRevision(
  prisma: PrismaClient,
  tid: string,
  input: CreateRevisionInput
): Promise<CreateRevisionResult> {
  const result = await prisma.$transaction(async (tx) => {
    await requireOwnedProject(tx, tid, input.projectId);

    const latest = await tx.siteRevision.findFirst({
      where: { projectId: input.projectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const revision = await tx.siteRevision.create({
      data: {
        projectId: input.projectId,
        version: nextVersion,
        briefJson: asInputJson(input.briefJson),
        planJson: asInputJson(input.planJson),
        createdByAgent: input.createdByAgent ?? null,
        parentRevisionId: input.parentRevisionId ?? null,
      },
    });

    const buildJob = await tx.buildJob.create({
      data: {
        revisionId: revision.id,
        status: 'queued',
      },
    });

    return { revision, buildJob };
  });

  return {
    revision: toSiteRevision(result.revision),
    buildJob: toBuildJob(result.buildJob),
  };
}

export async function attachCompiledArtifacts(
  prisma: PrismaClient,
  tid: string,
  revisionId: string,
  input: AttachCompiledArtifactsInput
): Promise<SiteRevision> {
  const row = await prisma.$transaction(async (tx) => {
    const existing = await tx.siteRevision.findFirst({
      where: { id: revisionId, project: { tenantId: tid } },
      select: { id: true },
    });
    if (!existing) {
      throw new Error(`Site revision not found for tenant: ${revisionId}`);
    }

    await tx.sitePage.deleteMany({ where: { revisionId } });

    if (input.pages.length > 0) {
      await tx.sitePage.createMany({
        data: input.pages.map((p) => ({
          revisionId,
          path: p.path,
          title: p.title,
          seoJson: asInputJson(p.seoJson),
          treeJson: asInputJson(p.treeJson),
          sortOrder: p.sortOrder,
        })),
      });
    }

    return tx.siteRevision.update({
      where: { id: revisionId },
      data: {
        artifactsPath: input.artifactsPath,
        ...(input.planJson !== undefined
          ? { planJson: input.planJson as Prisma.InputJsonValue }
          : {}),
        ...(input.qaReportJson !== undefined
          ? { qaReportJson: input.qaReportJson as Prisma.InputJsonValue }
          : {}),
      },
    });
  });

  return toSiteRevision(row);
}
