import { PrismaClient } from '@prisma/client';
import { DeployTarget } from '../../../domain/entities/DeployTarget';
import { UpsertDeployTargetInput } from '../../../domain/repositories/SiteRepository';
import { toDeployTarget } from '../prismaSiteMappers';
import { asOptionalNullableInputJson, requireOwnedProject } from '../prismaSiteRepoHelpers';

export async function findDeployTarget(
  prisma: PrismaClient,
  tid: string,
  projectId: string
): Promise<DeployTarget | null> {
  const project = await prisma.siteProject.findFirst({
    where: { id: projectId, tenantId: tid },
    select: { id: true },
  });
  if (!project) return null;

  const row = await prisma.deployTarget.findUnique({
    where: { projectId },
  });
  return row ? toDeployTarget(row) : null;
}

export async function upsertDeployTarget(
  prisma: PrismaClient,
  tid: string,
  projectId: string,
  input: UpsertDeployTargetInput
): Promise<DeployTarget> {
  await requireOwnedProject(prisma, tid, projectId);

  const row = await prisma.deployTarget.upsert({
    where: { projectId },
    create: {
      projectId,
      provider: input.provider,
      liveUrl: input.liveUrl ?? null,
      configJson: asOptionalNullableInputJson(input.configJson),
    },
    update: {
      provider: input.provider,
      liveUrl: input.liveUrl ?? null,
      configJson: asOptionalNullableInputJson(input.configJson),
    },
  });
  return toDeployTarget(row);
}
