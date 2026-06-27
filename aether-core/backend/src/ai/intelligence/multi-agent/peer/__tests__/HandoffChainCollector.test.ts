import { HandoffChainCollector } from '../HandoffChainCollector';

describe('HandoffChainCollector', () => {
  it('collects sync handoffs from agent_handoff events', () => {
    const collector = new HandoffChainCollector();
    collector.observe({
      type: 'agent_handoff',
      fromAgentKey: 'pricing',
      toAgentKey: 'supplier',
      handoffReason: 'chain:SUPPLIER_MONITOR',
      timestamp: new Date().toISOString(),
    });

    expect(collector.snapshot()).toEqual([
      {
        from: 'pricing',
        to: 'supplier',
        reason: 'chain:SUPPLIER_MONITOR',
        mode: 'sync',
        handoffMode: 'orchestrated',
      },
    ]);
  });

  it('preserves direct handoffMode from agent_handoff events', () => {
    const collector = new HandoffChainCollector();
    collector.observe({
      type: 'agent_handoff',
      fromAgentKey: 'supplier',
      toAgentKey: 'pricing',
      handoffReason: 'peer:PRICING_OPTIMIZE',
      handoffMode: 'direct',
      timestamp: new Date().toISOString(),
    });

    expect(collector.snapshot()[0]?.handoffMode).toBe('direct');
  });

  it('tracks async peer job lifecycle', () => {
    const collector = new HandoffChainCollector();
    collector.observe({
      type: 'peer_job_queued',
      fromAgentKey: 'pricing',
      toAgentKey: 'supplier',
      jobId: 'job-1',
      handoffReason: 'async:SUPPLIER_MONITOR',
      timestamp: new Date().toISOString(),
    });
    collector.observe({
      type: 'peer_job_completed',
      jobId: 'job-1',
      summary: 'Done',
      timestamp: new Date().toISOString(),
    });

    const snap = collector.snapshot();
    expect(snap[0]?.status).toBe('completed');
    expect(snap[0]?.summary).toBe('Done');
  });
});
