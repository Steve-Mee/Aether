import crypto from 'crypto';
import type { AdminDataPort } from '../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { extractKeywords } from '../merchant-knowledge/extractKeywords';
import { formatProductSnippet } from '../merchant-knowledge/formatProductSnippet';
import type { GlobalKnowledgeService } from '../global-knowledge/GlobalKnowledgeService';
import { formatGlobalPatchSnippet } from '../global-knowledge/globalKnowledgeUtils';
import type { PersonalBrainRegistry } from '../personal-brain/PersonalBrainRegistry';
import { chunkContent } from './chunkContent';

export type ChunkSource = 'vector' | 'keyword' | 'product_index' | 'global';

export interface RetrievedChunk {
  id: string;
  content: string;
  score: number;
  source: ChunkSource;
}

export interface RetrieveInput {
  tenantId: string;
  query: string;
  limit?: number;
  agentKey?: string;
}

const KEYWORD_BOOST = 0.3;
const EXACT_NAME_BOOST = 0.2;
const GLOBAL_CHUNK_SCORE = 0.35;

function contentHash(content: string): string {
  return crypto.createHash('sha256').update(content.trim()).digest('hex').slice(0, 16);
}

function chunkProductDescription(product: {
  id: string;
  name: string;
  price: number;
  stock: number;
  slug: string;
  description?: string | null;
}): RetrievedChunk[] {
  const base = formatProductSnippet(product);
  const chunks: RetrievedChunk[] = [
    {
      id: `product:${product.id}`,
      content: base,
      score: 0.5 + KEYWORD_BOOST,
      source: 'keyword',
    },
  ];

  const desc = product.description?.trim();
  if (desc && desc.length > 300) {
    for (const [i, part] of chunkContent(desc).entries()) {
      chunks.push({
        id: `product:${product.id}:desc:${i}`,
        content: `[product_desc] ${product.name} | ${part}`,
        score: 0.4 + KEYWORD_BOOST * 0.5,
        source: 'product_index',
      });
    }
  }

  return chunks;
}

/**
 * Hybrid retrieval: vector recall + keyword product search + optional global knowledge patches.
 */
export class ContextRetriever {
  constructor(
    private personalBrains: PersonalBrainRegistry,
    private adminData: AdminDataPort,
    private globalKnowledgeService?: GlobalKnowledgeService
  ) {}

  async retrieve(input: RetrieveInput): Promise<RetrievedChunk[]> {
    const { tenantId, query } = input;
    const limit = input.limit ?? 8;
    const agentKey = input.agentKey ?? 'admin';
    const brain = this.personalBrains.get(tenantId, agentKey);
    const chunks: RetrievedChunk[] = [];

    try {
      const recall = await brain.recall(query, 20);
      for (const match of recall.matches) {
        if (!match.content) continue;
        chunks.push({
          id: match.id,
          content: match.content,
          score: match.score,
          source: 'vector',
        });
      }
    } catch {
      // Vector recall best-effort
    }

    try {
      const keywords = extractKeywords(query);
      const keywordHits = await this.adminData.searchProductsByName(tenantId, keywords, 5);
      const queryLower = query.toLowerCase();

      for (const product of keywordHits) {
        const productChunks = chunkProductDescription(product);
        for (const c of productChunks) {
          const exactBoost =
            product.name.toLowerCase().includes(queryLower) ||
            queryLower.includes(product.name.toLowerCase())
              ? EXACT_NAME_BOOST
              : 0;
          chunks.push({ ...c, score: c.score + exactBoost });
        }
      }
    } catch {
      // Keyword search best-effort
    }

    if (this.globalKnowledgeService) {
      try {
        const topPatches = this.globalKnowledgeService.getTopPatchesForRetrieval(
          tenantId,
          agentKey,
          3
        );
        for (const patch of topPatches) {
          chunks.push({
            id: `global:${patch.id}`,
            content: formatGlobalPatchSnippet(patch),
            score: GLOBAL_CHUNK_SCORE + patch.priority * 0.01,
            source: 'global',
          });
        }
      } catch {
        // Global knowledge best-effort
      }
    }

    const seen = new Set<string>();
    return chunks
      .sort((a, b) => b.score - a.score)
      .filter((c) => {
        const key = contentHash(c.content);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
  }
}
