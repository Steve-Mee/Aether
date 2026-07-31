import { PrismaClient } from '@prisma/client';
import { BuildJob } from '../../../domain/entities/BuildJob';
import { UpdateBuildJobInput } from '../../../domain/repositories/SiteRepository';
import { toBuildJob } from '../prismaSiteMappers';

export async function createBuildJob(
  prisma: PrismaClient,
  tid: string,
  revisionId: string
): Promise<BuildJob> {
  const revision = await prisma.siteRevision.findFirst({
    where: { id: revisionId, project: { tenantId: tid } },
    select: { id: true },
  });
  if (!revision) {
    throw new Error(`Site revision not found for tenant: ${revisionId}`);
  }

  const row = await prisma.buildJob.create({
    data: {
      revisionId,
      status: 'queued',
    },
  });
  return toBuildJob(row);
}

export async function findBuildJobById(
  prisma: PrismaClient,
  tid: string,
  buildJobId: string
): Promise<BuildJob | null> {
  const row = await prisma.buildJob.findFirst({
    where: { id: buildJobId, revision: { project: { tenantId: tid } } },
  });
  return row ? toBuildJob(row) : null;
}

export async function updateBuildJob(
  prisma: PrismaClient,
  tid: string,
  buildJobId: string,
  input: UpdateBuildJobInput
): Promise<BuildJob> {
  const existing = await prisma.buildJob.findFirst({
    where: { id: buildJobId, revision: { project: { tenantId: tid } } },
    select: { id: true },
  });
  if (!existing) {
    throw new Error(`Build job not found for tenant: ${buildJobId}`);
  }

  const row = await prisma.buildJob.update({
    where: { id: buildJobId },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.logs !== undefined ? { logs: input.logs } : {}),
      ...(input.previewUrl !== undefined ? { previewUrl: input.previewUrl } : {}),
      ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
      ...(input.finishedAt !== undefined ? { finishedAt: input.finishedAt } : {}),
    },
  });
  return toBuildJob(row);
}

export async function listRecentBuildJobsForProject(
  prisma: PrismaClient,
  tid: string,
  projectId: string,
  take = 10
): Promise<BuildJob[]> {
  const project = await prisma.siteProject.findFirst({
    where: { id: projectId, tenantId: tid },
    select: { id: true },
  });
  if (!project) return [];

  const rows = await prisma.buildJob.findMany({
    where: { revision: { projectId } },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(take, 1), 50),
  });
  return rows.map((r) => toBuildJob(r));
}
