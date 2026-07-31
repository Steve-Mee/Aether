import { PrismaClient } from '@prisma/client';
import { SitePage } from '../../../domain/entities/SitePage';
import { toSitePage } from '../prismaSiteMappers';

export async function listPages(
  prisma: PrismaClient,
  tid: string,
  revisionId: string
): Promise<SitePage[]> {
  const rows = await prisma.sitePage.findMany({
    where: { revisionId, revision: { project: { tenantId: tid } } },
    orderBy: { sortOrder: 'asc' },
  });
  return rows.map((r) => toSitePage(r));
}

export async function findPageById(
  prisma: PrismaClient,
  tid: string,
  pageId: string
): Promise<SitePage | null> {
  const row = await prisma.sitePage.findFirst({
    where: { id: pageId, revision: { project: { tenantId: tid } } },
  });
  return row ? toSitePage(row) : null;
}

export async function findPageByPath(
  prisma: PrismaClient,
  tid: string,
  revisionId: string,
  path: string
): Promise<SitePage | null> {
  const row = await prisma.sitePage.findFirst({
    where: {
      revisionId,
      path,
      revision: { project: { tenantId: tid } },
    },
  });
  return row ? toSitePage(row) : null;
}
