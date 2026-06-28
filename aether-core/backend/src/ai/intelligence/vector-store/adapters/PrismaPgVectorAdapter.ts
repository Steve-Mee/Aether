import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { buildMetadataFilterSql } from '../metadataFilter';
import type { VectorStorePort } from '../VectorStorePort';
import type { VectorDocument, VectorMatch, VectorQuery } from '../types';
import { VECTOR_DIMENSION } from '../types';

function toVectorLiteral(embedding: number[]): string {
  if (embedding.length !== VECTOR_DIMENSION) {
    throw new Error(`Expected embedding dimension ${VECTOR_DIMENSION}, got ${embedding.length}`);
  }
  return `[${embedding.join(',')}]`;
}

export class PrismaPgVectorAdapter implements VectorStorePort {
  async upsert(tenantId: string, doc: VectorDocument): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaPgVectorAdapter.upsert');
    if (!doc.embedding?.length) {
      throw new Error('VectorDocument.embedding is required for pgvector upsert');
    }

    const vectorLiteral = toVectorLiteral(doc.embedding);
    const metadataJson = doc.metadata ? JSON.stringify(doc.metadata) : null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "BrainMemory" ("id", "tenantId", "content", "metadata", "embedding", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4::jsonb, $5::vector, NOW(), NOW())
       ON CONFLICT ("id") DO UPDATE SET
         "content" = EXCLUDED."content",
         "metadata" = EXCLUDED."metadata",
         "embedding" = EXCLUDED."embedding",
         "updatedAt" = NOW()`,
      doc.id,
      tid,
      doc.content,
      metadataJson,
      vectorLiteral
    );
  }

  async search(tenantId: string, query: VectorQuery): Promise<VectorMatch[]> {
    const tid = requireTenantId(tenantId, 'PrismaPgVectorAdapter.search');
    const limit = query.limit ?? 5;
    const vectorLiteral = toVectorLiteral(query.embedding);
    const { clause: metadataClause, params: metadataParams } = buildMetadataFilterSql(
      query.metadataFilter,
      4
    );

    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; content: string; metadata: unknown; score: number }>
    >(
      `SELECT
         "id",
         "content",
         "metadata",
         1 - ("embedding" <=> $1::vector) AS score
       FROM "BrainMemory"
       WHERE "tenantId" = $2
         AND "embedding" IS NOT NULL${metadataClause}
       ORDER BY "embedding" <=> $1::vector
       LIMIT $3`,
      vectorLiteral,
      tid,
      limit,
      ...metadataParams
    );

    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      score: Number(row.score),
      metadata: row.metadata as Record<string, unknown> | undefined,
    }));
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaPgVectorAdapter.delete');
    await prisma.brainMemory.deleteMany({ where: { id, tenantId: tid } });
  }
}
