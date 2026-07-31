import { PrismaClient } from '@prisma/client';
import { SiteProject } from '../../../domain/entities/SiteProject';
import { toSiteProject } from '../prismaSiteMappers';

export async function findProjectById(
  prisma: PrismaClient,
  tid: string,
  projectId: string
): Promise<SiteProject | null> {
  const row = await prisma.siteProject.findFirst({
    where: { id: projectId, tenantId: tid },
  });
  return row ? toSiteProject(row) : null;
}

export async function findProjectBySlug(
  prisma: PrismaClient,
  tid: string,
  slug: string
): Promise<SiteProject | null> {
  const row = await prisma.siteProject.findUnique({
    where: { tenantId_slug: { tenantId: tid, slug } },
  });
  return row ? toSiteProject(row) : null;
}

export async function findProjectByPublicSlug(
  prisma: PrismaClient,
  slug: string
): Promise<SiteProject | null> {
  if (!slug || typeof slug !== 'string') return null;
  // Prefer live > preview > other when slug collides across tenants.
  const ranked = await prisma.siteProject.findMany({
    where: { slug },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });
  const preferred =
    ranked.find((r) => r.status === 'live') ??
    ranked.find((r) => r.status === 'preview') ??
    ranked[0];
  return preferred ? toSiteProject(preferred) : null;
}

export async function listProjects(prisma: PrismaClient, tid: string): Promise<SiteProject[]> {
  const rows = await prisma.siteProject.findMany({
    where: { tenantId: tid },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => toSiteProject(r));
}

export async function listLiveProjects(prisma: PrismaClient, tid: string): Promise<SiteProject[]> {
  const rows = await prisma.siteProject.findMany({
    where: { tenantId: tid, status: 'live' },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map((r) => toSiteProject(r));
}
