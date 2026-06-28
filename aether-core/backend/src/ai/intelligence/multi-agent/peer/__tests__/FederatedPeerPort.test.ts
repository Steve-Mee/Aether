import { FederatedPeerPort } from '../FederatedPeerPort';
import type { AgentPatternSyncService } from '../../../global-knowledge/agent-patterns/AgentPatternSyncService';

describe('FederatedPeerPort', () => {
  it('returns anonymized snippets without tenant ids', async () => {
    const sync = {
      getContextSnippets: jest.fn().mockResolvedValue(['Trend: restock before price hikes']),
    } as unknown as AgentPatternSyncService;

    const port = new FederatedPeerPort(sync);
    const result = await port.requestAdvisory({
      tenantId: 'tenant-a',
      sourceAgentKey: 'pricing',
      query: 'industry trends',
    });

    expect(result.success).toBe(true);
    expect(result.snippets).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain('tenant-b');
    expect(result.disclaimer).toContain('Anonymized');
  });

  it('returns empty disclaimer when no patterns', async () => {
    const sync = {
      getContextSnippets: jest.fn().mockResolvedValue([]),
    } as unknown as AgentPatternSyncService;

    const port = new FederatedPeerPort(sync);
    const result = await port.requestAdvisory({
      tenantId: 'tenant-a',
      sourceAgentKey: 'pricing',
      query: 'trends',
    });

    expect(result.success).toBe(true);
    expect(result.snippets).toEqual([]);
  });
});
