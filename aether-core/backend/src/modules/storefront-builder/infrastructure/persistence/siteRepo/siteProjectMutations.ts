import { PrismaClient } from '@prisma/client';
import { SiteProject } from '../../../domain/entities/SiteProject';
import {
  CreateSiteProjectInput,
  CreateSiteProjectResult,
} from '../../../domain/repositories/SiteRepository';
import { toBuildJob, toSiteProject, toSiteRevision } from '../prismaSiteMappers';
import { asInputJson, requireOwnedProject } from '../prismaSiteRepoHelpers';

export async function createProjectWithInitialRevision(
  prisma: PrismaClient,
  tid: string,
  input: CreateSiteProjectInput
): Promise<CreateSiteProjectResult> {
  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.siteProject.create({
      data: {
        tenantId: tid,
        slug: input.slug,
        primaryDomain: input.primaryDomain ?? null,
        status: 'draft',
      },
    });

    const revision = await tx.siteRevision.create({
      data: {
        projectId: project.id,
        version: 1,
        briefJson: asInputJson(input.briefJson),
        planJson: asInputJson(input.planJson),
        createdByAgent: input.createdByAgent ?? null,
      },
    });

    const buildJob = await tx.buildJob.create({
      data: {
        revisionId: revision.id,
        status: 'queued',
      },
    });

    return { project, revision, buildJob };
  });

  return {
    project: toSiteProject(result.project),
    revision: toSiteRevision(result.revision),
    buildJob: toBuildJob(result.buildJob),
  };
}

export async function markProjectLive(
  prisma: PrismaClient,
  tid: string,
  projectId: string,
  revisionId: string,
  opts?: { liveUrl?: string | null; provider?: string }
): Promise<SiteProject> {
  await requireOwnedProject(prisma, tid, projectId);

  const revision = await prisma.siteRevision.findFirst({
    where: { id: revisionId, projectId },
    select: { id: true },
  });
  if (!revision) {
    throw new Error(`Site revision not found for project: ${revisionId}`);
  }

  const updated = await prisma.siteProject.update({
    where: { id: projectId },
    data: {
      status: 'live',
      liveRevisionId: revisionId,
    },
  });

  if (opts?.liveUrl !== undefined) {
    const provider = opts.provider ?? 'local';
    await prisma.deployTarget.upsert({
      where: { projectId },
      create: {
        projectId,
        provider,
        liveUrl: opts.liveUrl,
        lastDeployedRevisionId: revisionId,
      },
      update: {
        provider,
        liveUrl: opts.liveUrl,
        lastDeployedRevisionId: revisionId,
      },
    });
  }

  return toSiteProject(updated);
}

export async function demoteProjectFromLive(
  prisma: PrismaClient,
  tid: string,
  projectId: string,
  reason: string
): Promise<SiteProject> {
  const project = await requireOwnedProject(prisma, tid, projectId);
  if (project.status !== 'live' && !project.liveRevisionId) {
    return toSiteProject(project);
  }
  const updated = await prisma.siteProject.update({
    where: { id: projectId },
    data: {
      status: 'preview',
      liveRevisionId: null,
    },
  });
  void reason; // audited by caller via events
  return toSiteProject(updated);
}
