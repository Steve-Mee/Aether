import type { AdminDataPort } from '../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { MerchantKnowledgeIndexer } from '../merchant-knowledge/MerchantKnowledgeIndexer';
import type { ContextRetriever } from '../retrieval/ContextRetriever';

export interface PrepareCommandInput {
  tenantId: string;
  command: string;
  actorId?: string;
}

export interface PrepareCommandOutput {
  contextSnippets: string[];
  recallMatches: Array<{ id: string; score: number }>;
  retrievalError?: string;
}

/**
 * Orchestrates merchant knowledge indexing and hybrid retrieval for Command Bar RAG.
 */
export class CommandBrainService {
  constructor(
    private indexer: MerchantKnowledgeIndexer,
    private contextRetriever: ContextRetriever,
    private adminData: AdminDataPort
  ) {}

  async prepareCommand(input: PrepareCommandInput): Promise<PrepareCommandOutput> {
    const { tenantId, command } = input;
    const agentKey = 'admin';

    try {
      await this.indexer.ensureIndexed(tenantId, agentKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Knowledge indexing failed';
      return { contextSnippets: [], recallMatches: [], retrievalError: message };
    }

    try {
      const chunks = await this.contextRetriever.retrieve({ tenantId, query: command, agentKey });
      return {
        contextSnippets: chunks.map((c) => c.content),
        recallMatches: chunks.map((c) => ({ id: c.id, score: c.score })),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Retrieval failed';
      return { contextSnippets: [], recallMatches: [], retrievalError: message };
    }
  }
}
