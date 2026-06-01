jest.mock('../shared/prisma/client', () => ({
  prisma: {
    workflowRun: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'run_1',
        workflow: 'mail.classify',
        status: 'running',
        createdAt: new Date('2026-01-01'),
        steps: [
          {
            name: 'start',
            status: 'completed',
            input: '{"emailId":"em_1"}',
            output: null,
            createdAt: new Date('2026-01-01'),
          },
          {
            name: 'policy',
            status: 'completed',
            input: null,
            output: '{"riskClass":"medium","requiresApproval":false}',
            createdAt: new Date('2026-01-01'),
          },
        ],
      }),
    },
  },
}));

import { workflowEngine } from '../ai/orchestrator/WorkflowEngine';

describe('WorkflowEngine trace', () => {
  it('returns ordered steps for audit chain', async () => {
    const trace = await workflowEngine.getRunTrace('run_1', 'tenant_default');
    expect(trace).not.toBeNull();
    expect(trace!.workflow).toBe('mail.classify');
    expect(trace!.steps).toHaveLength(2);
    expect(trace!.steps[0].name).toBe('start');
    expect(trace!.steps[1].output?.riskClass).toBe('medium');
  });
});
