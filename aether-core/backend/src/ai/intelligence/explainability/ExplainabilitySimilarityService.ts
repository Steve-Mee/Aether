import type { AgentExplainabilitySnapshot } from '@prisma/client';
import { explainabilityPersister } from './ExplainabilityPersister';
import { explainabilityPatternContributionService } from './global/ExplainabilityPatternContributionService';
import type { ExplainabilityPayload, ExplainabilitySourceType, SimilarActionRef } from './types';

const SIMILARITY_DAYS = 90;

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const k of setA) {
    if (setB.has(k)) intersection += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function recencyBoost(createdAt: Date): number {
  const ageMs = Date.now() - createdAt.getTime();
  const days = ageMs / (24 * 60 * 60 * 1000);
  if (days <= 1) return 1;
  if (days <= 7) return 0.7;
  if (days <= 30) return 0.4;
  return 0.2;
}

function buildDiffHints(
  current: { agentKeys: string[]; triggerId?: string | null; intentId?: string | null },
  other: AgentExplainabilitySnapshot
): string[] {
  const hints: string[] = [];
  const otherAgents = new Set(other.agentKeys);
  const currentAgents = new Set(current.agentKeys);
  const missing = [...currentAgents].filter((k) => !otherAgents.has(k));
  const extra = [...otherAgents].filter((k) => !currentAgents.has(k));
  if (missing.length > 0) {
    hints.push(`Eerdere actie miste: ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    hints.push(`Eerdere actie had extra: ${extra.join(', ')}`);
  }
  if (current.triggerId && other.triggerId && current.triggerId !== other.triggerId) {
    hints.push('Andere trigger');
  }
  return hints.slice(0, 3);
}

function scoreSimilarity(
  current: {
    agentKeys: string[];
    triggerId?: string | null;
    intentId?: string | null;
    sourceType: string;
  },
  other: AgentExplainabilitySnapshot
): number {
  let score = 0;
  const agentOverlap = jaccard(current.agentKeys, other.agentKeys);
  score += agentOverlap * 3;
  if (current.triggerId && current.triggerId === other.triggerId) score += 2;
  if (current.intentId && current.intentId === other.intentId) score += 2;
  if (current.sourceType === other.sourceType) score += 1;
  score *= recencyBoost(other.createdAt);
  return score;
}

export class ExplainabilitySimilarityService {
  async findSimilar(params: {
    tenantId: string;
    sourceType: ExplainabilitySourceType;
    sourceId: string;
    agentKeys: string[];
    triggerId?: string | null;
    intentId?: string | null;
    includeGlobal?: boolean;
    limit?: number;
  }): Promise<SimilarActionRef[]> {
    const since = new Date(Date.now() - SIMILARITY_DAYS * 24 * 60 * 60 * 1000);
    const candidates = await explainabilityPersister.listForSimilarity(
      params.tenantId,
      params.sourceId,
      since,
      50
    );

    const tenantScored = candidates
      .map((row) => ({
        row,
        score: scoreSimilarity(
          {
            agentKeys: params.agentKeys,
            triggerId: params.triggerId,
            intentId: params.intentId,
            sourceType: params.sourceType,
          },
          row
        ),
      }))
      .filter((s) => s.score > 0.5)
      .sort((a, b) => b.score - a.score);

    const tenantRefs: SimilarActionRef[] = tenantScored.map(({ row, score }) => ({
      sourceType: row.sourceType as ExplainabilitySourceType,
      sourceId: row.sourceId,
      summary: row.summary,
      at: row.createdAt.toISOString(),
      similarityScore: Math.round(score * 100) / 100,
      diffHints: buildDiffHints(
        {
          agentKeys: params.agentKeys,
          triggerId: params.triggerId,
          intentId: params.intentId,
        },
        row
      ),
      scope: 'tenant',
    }));

    const limit = params.limit ?? 3;
    let results = tenantRefs.slice(0, limit);

    if (params.includeGlobal && results.length < limit) {
      const globalMatches = await explainabilityPatternContributionService.listGlobalPatterns({
        agentKeys: params.agentKeys,
        triggerId: params.triggerId,
        intentId: params.intentId,
        sourceType: params.sourceType,
        limit: limit - results.length,
      });

      for (const { row, score } of globalMatches) {
        results.push({
          sourceType: row.sourceType as ExplainabilitySourceType,
          summary: row.summaryTemplate,
          similarityScore: Math.round(score * 100) / 100,
          diffHints: [`Vergelijkbaar patroon bij ${row.tenantCount} merchants`],
          scope: 'global',
          peerTenantCount: row.tenantCount,
          patternKey: row.patternKey,
        });
      }
    }

    return results.slice(0, limit);
  }
}

export const explainabilitySimilarityService = new ExplainabilitySimilarityService();
