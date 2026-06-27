import { DelegationProtocol } from '../DelegationProtocol';

describe('DelegationProtocol', () => {
  const protocol = new DelegationProtocol();

  it('creates request with handoff package and resume token', () => {
    const { state, handoffPackage, resumeToken } = protocol.createRequest({
      parentRunId: 'parent-1',
      sourceAgentKey: 'admin',
      targetAgentKey: 'mail',
      intent: 'EMAIL_SUMMARY',
      contextSummary: 'Inbox context',
    });

    expect(state.phase).toBe('request');
    expect(state.parentRunId).toBe('parent-1');
    expect(handoffPackage.targetAgentKey).toBe('mail');
    expect(resumeToken.parentRunId).toBe('parent-1');
    expect(resumeToken.delegationId).toBe(state.delegationId);
  });

  it('progresses through execute, reflect, return, resume', () => {
    const { state } = protocol.createRequest({
      parentRunId: 'parent-1',
      sourceAgentKey: 'admin',
      targetAgentKey: 'supplier',
      intent: 'SUPPLIER_MONITOR',
      contextSummary: 'Supplier sync',
    });

    const executing = protocol.markExecute(state, 'child-1');
    expect(executing.phase).toBe('execute');
    expect(executing.childRunId).toBe('child-1');

    const reflecting = protocol.markReflect(executing, ['mem-1']);
    expect(reflecting.phase).toBe('reflect');
    expect(reflecting.handoffPackage?.reflectionIds).toEqual(['mem-1']);

    const returnPkg = protocol.buildReturnPackage(reflecting, 'Done', ['mem-1']);
    expect(returnPkg.sourceAgentKey).toBe('supplier');
    expect(returnPkg.targetAgentKey).toBe('admin');
    expect(returnPkg.summary).toBe('Done');

    const resumed = protocol.markResume(reflecting);
    expect(resumed.phase).toBe('resume');
    expect(protocol.buildResumeContextBlock(returnPkg)).toContain('Done');
  });
});
