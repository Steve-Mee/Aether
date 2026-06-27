import type { AgentPatternSyncService } from '../../global-knowledge/agent-patterns/AgentPatternSyncService';

export const GLOBAL_ADVISORY_AGENT_KEY = 'global-advisory';

export interface FederatedPeerRequest {
  tenantId: string;
  sourceAgentKey: string;
  query: string;
  agentKey?: string;
}

export interface FederatedPeerResult {
  success: boolean;
  snippets: string[];
  disclaimer: string;
  error?: string;
}

export class FederatedPeerPort {
  constructor(private agentPatternSync: AgentPatternSyncService) {}

  async requestAdvisory(request: FederatedPeerRequest): Promise<FederatedPeerResult> {
    try {
      const snippets = await this.agentPatternSync.getContextSnippets(
        request.tenantId,
        request.agentKey
      );
      if (snippets.length === 0) {
        return {
          success: true,
          snippets: [],
          disclaimer:
            'Geen federated patronen beschikbaar. Schakel cross-tenant agent patterns in voor globaal advies.',
        };
      }
      return {
        success: true,
        snippets,
        disclaimer:
          'Anonymized federated trends — geen ruwe merchantdata van andere tenants.',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Federated advisory failed';
      return { success: false, snippets: [], disclaimer: '', error: message };
    }
  }
}
