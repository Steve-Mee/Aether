import { executeApprovedAction } from '../../approvalExecutor';
import { StorefrontPublishApprovalHandler } from '../storefrontPublishApprovalHandler';
import { resolveApproval } from '../../approvalService';

const findProjectById = jest.fn();
const findRevisionById = jest.fn();
const deploy = jest.fn();

jest.mock('../../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    storefrontDeploy: { deploy },
    siteRepository: {
      findProjectById,
      findRevisionById,
    },
  }),
}));

jest.mock('../../../prisma/client', () => ({
  prisma: {
    auditLog: { findFirst: jest.fn().mockResolvedValue(null) },
    approval: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('../../../audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock(
  '../../../../modules/admin-command-bar/application/services/OverviewFeedNotify',
  () => ({
    notifyOverviewApproval: jest.fn(),
  })
);

const { prisma } = require('../../../prisma/client');
const { writeAuditLog } = require('../../../audit/auditService');
const { eventBus } = require('../../../events/eventBus');

describe('StorefrontPublishApprovalHandler', () => {
  const prevDeploy = process.env.STOREFRONT_DEPLOY_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.STOREFRONT_DEPLOY_ENABLED;
    prisma.auditLog.findFirst.mockResolvedValue(null);
    findProjectById.mockResolvedValue({
      id: 'proj_1',
      tenantId: 'tenant_a',
      status: 'preview',
      liveRevisionId: null,
    });
    findRevisionById.mockResolvedValue({
      id: 'rev_1',
      projectId: 'proj_1',
    });
    deploy.mockResolvedValue({
      liveUrl: 'https://proj_1.storefront.local/r/rev_1',
      staged: true,
      provider: 'stub',
    });
  });

  afterEach(() => {
    if (prevDeploy === undefined) delete process.env.STOREFRONT_DEPLOY_ENABLED;
    else process.env.STOREFRONT_DEPLOY_ENABLED = prevDeploy;
  });

  it('canHandle storefront-builder / PUBLISH_STOREFRONT only', () => {
    const handler = new StorefrontPublishApprovalHandler();
    expect(handler.canHandle('storefront-builder', 'PUBLISH_STOREFRONT')).toBe(true);
    expect(handler.canHandle('storefront-builder', 'refund')).toBe(false);
    expect(handler.canHandle('payment-fulfillment', 'PUBLISH_STOREFRONT')).toBe(false);
  });

  it('approve path: executeApprovedAction deploys via StubDeploy (owns DB live)', async () => {
    await executeApprovedAction({
      tenantId: 'tenant_a',
      approvalId: 'appr_1',
      module: 'storefront-builder',
      actionType: 'PUBLISH_STOREFRONT',
      payload: { projectId: 'proj_1', revisionId: 'rev_1', qaScore: 0.9 },
      resolvedBy: 'operator_1',
    });

    expect(deploy).toHaveBeenCalledWith({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
    });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_a',
        module: 'storefront-builder',
        action: 'action_executed',
        details: expect.objectContaining({
          approvalId: 'appr_1',
          projectId: 'proj_1',
          revisionId: 'rev_1',
          staged: true,
          provider: 'stub',
        }),
      })
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'website.publish.approved', tenantId: 'tenant_a' })
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'website.deploy.succeeded', tenantId: 'tenant_a' })
    );
  });

  it('reject path: resolveApproval(false) does not deploy', async () => {
    prisma.approval.findFirst.mockResolvedValue({
      id: 'appr_2',
      tenantId: 'tenant_a',
      module: 'storefront-builder',
      actionType: 'PUBLISH_STOREFRONT',
      payload: JSON.stringify({ projectId: 'proj_1', revisionId: 'rev_1' }),
      status: 'pending',
    });

    await resolveApproval({
      id: 'appr_2',
      tenantId: 'tenant_a',
      approve: false,
      resolvedBy: 'operator_1',
    });

    expect(deploy).not.toHaveBeenCalled();
  });

  it('wrong tenant: project missing → fails closed, no deploy', async () => {
    findProjectById.mockResolvedValue(null);

    await expect(
      executeApprovedAction({
        tenantId: 'tenant_b',
        approvalId: 'appr_3',
        module: 'storefront-builder',
        actionType: 'PUBLISH_STOREFRONT',
        payload: { projectId: 'proj_1', revisionId: 'rev_1' },
        resolvedBy: 'operator_1',
      })
    ).rejects.toThrow(/Site project not found for tenant/);

    expect(deploy).not.toHaveBeenCalled();
  });

  it('deploy failure: audits fail, does not succeed', async () => {
    deploy.mockRejectedValue(new Error('CDN unreachable'));

    await expect(
      executeApprovedAction({
        tenantId: 'tenant_a',
        approvalId: 'appr_fail',
        module: 'storefront-builder',
        actionType: 'PUBLISH_STOREFRONT',
        payload: { projectId: 'proj_1', revisionId: 'rev_1' },
        resolvedBy: 'operator_1',
      })
    ).rejects.toThrow(/CDN unreachable/);

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_a',
        module: 'storefront-builder',
        action: 'website_deploy_failed',
        details: expect.objectContaining({
          approvalId: 'appr_fail',
          projectId: 'proj_1',
          revisionId: 'rev_1',
          error: 'CDN unreachable',
        }),
      })
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'website.deploy.failed', tenantId: 'tenant_a' })
    );
    expect(writeAuditLog).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'action_executed' })
    );
  });

  it('end-to-end approve via resolveApproval → deploy called', async () => {
    prisma.approval.findFirst.mockResolvedValue({
      id: 'appr_e2e',
      tenantId: 'tenant_a',
      module: 'storefront-builder',
      actionType: 'PUBLISH_STOREFRONT',
      payload: JSON.stringify({ projectId: 'proj_1', revisionId: 'rev_1' }),
      status: 'pending',
    });

    await resolveApproval({
      id: 'appr_e2e',
      tenantId: 'tenant_a',
      approve: true,
      resolvedBy: 'operator_1',
    });

    expect(deploy).toHaveBeenCalledWith({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
    });
  });
});
