import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { writeAuditLog } from '../../audit/auditService';
import { eventBus } from '../../events/eventBus';
import { logger } from '../../logging/logger';
import { prisma } from '../../prisma/client';
import { sanitizePiiForLogs } from '../../security/sanitizePiiForLogs';
import type { ApprovalActionHandler, ApprovalExecutionContext } from '../types';

/**
 * Executes PUBLISH_STOREFRONT after human approval:
 * DeployPort.deploy (stub owns DB live + artifact pointer) → audit.
 * Never runs without resolveApproval(approve=true).
 */
export class StorefrontPublishApprovalHandler implements ApprovalActionHandler {
  canHandle(module: string, actionType: string): boolean {
    return module === 'storefront-builder' && actionType === 'PUBLISH_STOREFRONT';
  }

  async execute(ctx: ApprovalExecutionContext): Promise<void> {
    const projectId = String(ctx.payload.projectId ?? '').trim();
    const revisionId = String(ctx.payload.revisionId ?? '').trim();
    if (!projectId || !revisionId) {
      throw new Error('PUBLISH_STOREFRONT approval missing projectId or revisionId');
    }

    const dedupeToken = `"approvalId":"${ctx.approvalId}"`;
    const alreadyExecuted = await prisma.auditLog.findFirst({
      where: {
        tenantId: ctx.tenantId,
        action: 'action_executed',
        details: { contains: dedupeToken },
      },
    });
    if (alreadyExecuted) return;

    const { storefrontDeploy, siteRepository } = getCompositionRoot();

    // Tenant check before deploy — wrong-tenant project must fail closed
    const project = await siteRepository.findProjectById(ctx.tenantId, projectId);
    if (!project) {
      throw new Error(`Site project not found for tenant: ${projectId}`);
    }

    const revision = await siteRepository.findRevisionById(ctx.tenantId, revisionId);
    if (!revision || revision.projectId !== projectId) {
      throw new Error(`Site revision not found for project: ${revisionId}`);
    }

    await eventBus.publish({
      tenantId: ctx.tenantId,
      type: 'website.publish.approved',
      payload: {
        approvalId: ctx.approvalId,
        projectId,
        revisionId,
        resolvedBy: ctx.resolvedBy,
      },
      idempotencyKey: `website.publish.approved:${ctx.approvalId}`,
    });

    try {
      // StubDeployAdapter owns DB live + artifact pointer (Appendix G); handler audits only.
      const deployResult = await storefrontDeploy.deploy({
        tenantId: ctx.tenantId,
        projectId,
        revisionId,
      });

      await eventBus.publish({
        tenantId: ctx.tenantId,
        type: 'website.deploy.succeeded',
        payload: {
          approvalId: ctx.approvalId,
          projectId,
          revisionId,
          staged: deployResult.staged === true,
          provider: deployResult.provider ?? 'stub',
        },
        idempotencyKey: `website.deploy.succeeded:${ctx.approvalId}`,
      });

      await writeAuditLog({
        tenantId: ctx.tenantId,
        module: 'storefront-builder',
        action: 'action_executed',
        actor: ctx.resolvedBy,
        details: {
          approvalId: ctx.approvalId,
          actionType: 'PUBLISH_STOREFRONT',
          projectId,
          revisionId,
          liveUrl: deployResult.liveUrl,
          staged: deployResult.staged === true,
          provider: deployResult.provider ?? 'stub',
          dedupeToken,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        'website_deploy_failed',
        sanitizePiiForLogs({
          tenantId: ctx.tenantId,
          approvalId: ctx.approvalId,
          projectId,
          revisionId,
          error: message,
        })
      );
      await writeAuditLog({
        tenantId: ctx.tenantId,
        module: 'storefront-builder',
        action: 'website_deploy_failed',
        actor: ctx.resolvedBy,
        details: {
          approvalId: ctx.approvalId,
          actionType: 'PUBLISH_STOREFRONT',
          projectId,
          revisionId,
          error: message.slice(0, 200),
        },
      });
      await eventBus.publish({
        tenantId: ctx.tenantId,
        type: 'website.deploy.failed',
        payload: {
          approvalId: ctx.approvalId,
          projectId,
          revisionId,
          error: message.slice(0, 200),
        },
        idempotencyKey: `website.deploy.failed:${ctx.approvalId}:${message.slice(0, 40)}`,
      });
      throw err;
    }
  }
}
