import type { GlobalBrainPort } from '../global-brain/GlobalBrainPort';
import type { KnowledgeTransferGatePort } from '../knowledge-transfer/KnowledgeTransferGatePort';

const TOOL_CATEGORY: Record<string, 'pricing' | 'conversion' | 'trend' | 'inventory' | 'marketing'> = {
  updatePrice: 'pricing',
  syncSupplier: 'inventory',
  suggestRestock: 'inventory',
  createInsight: 'marketing',
  createApproval: 'trend',
};

export async function buildApprovalRationale(input: {
  tenantId: string;
  tool: string;
  baseRationale?: string;
  learnedHint?: string;
  ktGate?: KnowledgeTransferGatePort;
  globalBrain?: GlobalBrainPort;
}): Promise<{ rationale: string; ktSnippets?: string[]; learnedHint?: string }> {
  const parts: string[] = [];
  if (input.baseRationale?.trim()) parts.push(input.baseRationale.trim());
  if (input.learnedHint?.trim()) parts.push(input.learnedHint.trim());

  let ktSnippets: string[] | undefined;
  if (input.ktGate && input.globalBrain && (await input.ktGate.isEnabled(input.tenantId))) {
    const category = TOOL_CATEGORY[input.tool] ?? 'trend';
    try {
      const insights = await input.globalBrain.getCollectiveInsights(input.tenantId, [category]);
      const summaries = insights.map((i) => i.summary).filter(Boolean).slice(0, 2);
      if (summaries.length > 0) {
        ktSnippets = summaries;
        parts.push(`Collectief inzicht (${category}): ${summaries[0]}`);
      }
    } catch {
      // best-effort KT enrichment
    }
  }

  return {
    rationale: parts.length > 0 ? parts.join(' · ') : 'Voorgesteld door het persoonlijke brein.',
    ktSnippets,
    learnedHint: input.learnedHint,
  };
}
