import { Prisma, PrismaClient } from '@prisma/client';

type PrismaDb = PrismaClient | Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export function asInputJson(
  value: unknown | undefined | null,
  fallback: Prisma.InputJsonValue = {}
): Prisma.InputJsonValue {
  return (value ?? fallback) as Prisma.InputJsonValue;
}

export function asOptionalNullableInputJson(
  value: unknown | undefined
): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return (value ?? Prisma.JsonNull) as Prisma.InputJsonValue;
}

export async function requireOwnedProject(db: PrismaDb, tenantId: string, projectId: string) {
  const project = await db.siteProject.findFirst({
    where: { id: projectId, tenantId },
  });
  if (!project) {
    throw new Error(`Site project not found for tenant: ${projectId}`);
  }
  return project;
}
