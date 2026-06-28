import { delegateToAgentTool } from '../delegateToAgentTool';
import type { AgentPeerPort } from '../AgentPeerPort';

describe('delegateToAgentTool', () => {
  const mockPeerBus: AgentPeerPort = {
    requestPeerHandoff: jest.fn().mockResolvedValue({
      success: true,
      narrative: 'Pricing analysis complete',
      agentRunId: 'run-pricing-1',
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates with contextPayload to peer bus', async () => {
    const tool = delegateToAgentTool({ peerBus: mockPeerBus, defaultSourceAgentKey: 'supplier' });
    const events: unknown[] = [];
    const result = (await tool.executeRead!(
      {
        tenantId: 't1',
        agentKey: 'supplier',
        peerDepth: 0,
        onEvent: (e) => events.push(e),
      },
      {
        targetAgentKey: 'pricing',
        intent: 'PRICING_OPTIMIZE',
        query: 'Review price drop opportunities',
        contextPayload: {
          messageType: 'intel',
          summary: '3 price drops detected',
          payload: { suggestedPricingActions: [{ productId: 'p1', action: 'review_price_decrease_opportunity' }] },
        },
      }
    )) as { success: boolean; correlationId?: string };

    expect(result.success).toBe(true);
    expect(result.correlationId).toBeDefined();
    expect(mockPeerBus.requestPeerHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceAgentKey: 'supplier',
        targetAgentKey: 'pricing',
        intent: 'PRICING_OPTIMIZE',
        contextPayload: expect.objectContaining({
          messageType: 'intel',
          payload: expect.objectContaining({ suggestedPricingActions: expect.any(Array) }),
        }),
      })
    );
    expect(events.some((e) => (e as { type: string }).type === 'agent_peer_message')).toBe(true);
  });

  it('validates required fields', () => {
    const tool = delegateToAgentTool({ peerBus: mockPeerBus });
    expect(tool.validate({ targetAgentKey: '', intent: 'X', query: 'Y' }).ok).toBe(false);
    expect(tool.validate({ targetAgentKey: 'pricing', intent: '', query: 'Y' }).ok).toBe(false);
    expect(tool.validate({ targetAgentKey: 'pricing', intent: 'X', query: '' }).ok).toBe(false);
    expect(tool.validate({ targetAgentKey: 'pricing', intent: 'X', query: 'ok' }).ok).toBe(true);
  });
});
