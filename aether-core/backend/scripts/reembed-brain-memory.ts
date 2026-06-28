/**
 * Re-embed all BrainMemory rows after switching embedding backend (hash → Ollama).
 * Usage: npx ts-node scripts/reembed-brain-memory.ts [--tenantId=xxx]
 */
import { prisma } from '../src/shared/prisma/client';
import { createProductionEmbedding } from '../src/ai/intelligence/vector-store/ResilientEmbeddingAdapter';
import { resolveVectorStore } from '../src/ai/intelligence/vector-store/TenantRoutingVectorStoreAdapter';

async function main() {
  const tenantArg = process.argv.find((a) => a.startsWith('--tenantId='));
  const tenantFilter = tenantArg?.split('=')[1];
  const embedding = createProductionEmbedding();
  const vectorStore = resolveVectorStore();

  const rows = await prisma.brainMemory.findMany({
    where: tenantFilter ? { tenantId: tenantFilter } : undefined,
    select: { id: true, tenantId: true, content: true, metadata: true },
  });

  console.log(`Re-embedding ${rows.length} brain memories (backend=${process.env.INTELLIGENCE_EMBEDDING ?? 'hash'})...`);
  for (const row of rows) {
    const vec = await embedding.embed(row.content);
    await vectorStore.upsert(row.tenantId, {
      id: row.id,
      content: row.content,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      embedding: vec,
    });
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
