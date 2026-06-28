import {
  buildPeerQuery,
  parsePeerContext,
  peerContextToChainLine,
  summarizePayloadForAudit,
  PEER_INTEL_PREFIX,
} from '../AgentPeerMessage';

describe('AgentPeerMessage', () => {
  it('buildPeerQuery combines summary and payload', () => {
    const query = buildPeerQuery({
      messageType: 'intel',
      summary: 'Price drop detected',
      payload: { productId: 'p1' },
    });
    expect(query).toContain('Price drop detected');
    expect(query).toContain(PEER_INTEL_PREFIX);
    expect(query).toContain('"productId":"p1"');
  });

  it('parsePeerContext round-trips structured intel', () => {
    const original = {
      messageType: 'intel' as const,
      summary: 'Low stock alert',
      payload: { lowStockSkus: [{ productId: 'p1', quantity: 2 }] },
      correlationId: 'abc12345',
    };
    const parsed = parsePeerContext(buildPeerQuery(original));
    expect(parsed?.messageType).toBe('intel');
    expect(parsed?.summary).toBe('Low stock alert');
    expect(parsed?.payload?.lowStockSkus).toEqual([{ productId: 'p1', quantity: 2 }]);
  });

  it('parsePeerContext handles plain query without payload', () => {
    const parsed = parsePeerContext('Check inventory for SKU-42');
    expect(parsed?.summary).toBe('Check inventory for SKU-42');
    expect(parsed?.messageType).toBe('request');
  });

  it('peerContextToChainLine serializes for chainContext', () => {
    const line = peerContextToChainLine({
      messageType: 'intel',
      summary: 'Supplier cost down',
      payload: { changePct: -3 },
      correlationId: 'corr-1',
    });
    expect(line.startsWith(PEER_INTEL_PREFIX)).toBe(true);
    expect(line).toContain('corr-1');
  });

  it('summarizePayloadForAudit truncates long payloads', () => {
    const summary = summarizePayloadForAudit({
      messageType: 'intel',
      summary: 'Test',
      correlationId: 'x1',
      payload: { data: 'x'.repeat(600) },
    });
    expect(summary!.length).toBeLessThanOrEqual(500);
    expect(summary).toContain('corr:x1');
  });
});
