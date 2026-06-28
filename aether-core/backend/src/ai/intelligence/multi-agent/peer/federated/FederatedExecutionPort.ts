import crypto from 'crypto';
import { prisma } from '../../../../../shared/prisma/client';
import type { AgentPatternSyncService } from '../../../global-knowledge/agent-patterns/AgentPatternSyncService';
import type { MessageBrokerPort } from '../../../../../shared/messaging/MessageBrokerPort';
import { getFederatedDeploymentId, isFederatedRpcEnabled } from '../../../../../shared/messaging/messagingConfig';
import { hashQueryHint } from './FederatedDeploymentRegistry';
import { SummaryDistiller } from './SummaryDistiller';
import { FederatedExecutionGate } from './FederatedExecutionGate';
import { FederatedRpcClient } from './FederatedRpcClient';

export interface FederatedSandboxRequest {
  tenantId: string;
  sourceAgentKey: string;
  capability: string;
  queryHint?: string;
}

export interface FederatedSandboxResult {
  success: boolean;
  summary?: string;
  disclaimer?: string;
  error?: string;
  requestId?: string;
}

export class FederatedExecutionPort {
  private distiller = new SummaryDistiller();
  private rpcClient: FederatedRpcClient;

  constructor(
    private agentPatternSync: AgentPatternSyncService,
    private gate: FederatedExecutionGate,
    broker?: MessageBrokerPort
  ) {
    this.rpcClient = new FederatedRpcClient(broker);
    this.rpcClient.registerResponseHandler();
  }

  async requestSandboxExecution(
    request: FederatedSandboxRequest
  ): Promise<FederatedSandboxResult> {
    if (!(await this.gate.isConsumerEnabled(request.tenantId))) {
      return {
        success: false,
        error: 'Federated execution sandbox is disabled for this tenant',
      };
    }

    const queryHintHash = hashQueryHint(request.queryHint);
    const requestId = crypto.randomUUID();
    const start = Date.now();

    try {
      if (isFederatedRpcEnabled()) {
        const deployment = await this.rpcClient.resolveDeploymentForCapability(
          request.capability
        );
        if (deployment && deployment.deploymentId !== getFederatedDeploymentId()) {
          const remote = await this.rpcClient.executeRemote({
            tenantId: request.tenantId,
            sourceAgentKey: request.sourceAgentKey,
            capability: request.capability,
            queryHint: request.queryHint,
            targetDeploymentId: deployment.deploymentId,
            targetTenantId: request.tenantId,
          });
          if (remote?.success && remote.summary) {
            const summary = this.distiller.distill(remote.summary);
            const summaryHash = crypto.createHash('sha256').update(summary).digest('hex');
            await prisma.federatedExecutionAudit.create({
              data: {
                tenantId: request.tenantId,
                requestId: remote.requestId,
                sourceAgentKey: request.sourceAgentKey,
                capability: request.capability,
                summaryHash,
                summary,
                sourceDeploymentId: getFederatedDeploymentId(),
                targetDeploymentId: deployment.deploymentId,
                remoteExecutionRef: remote.remoteExecutionRef ?? null,
                responseLatencyMs: Date.now() - start,
                queryHintHash: queryHintHash ?? null,
              },
            });
            return {
              success: true,
              summary,
              disclaimer:
                'Federated sandbox v2 — remote deployment execution; anonymized summary only.',
              requestId: remote.requestId,
            };
          }
        }
      }

      const snippets = await this.agentPatternSync.getContextSnippets(
        request.tenantId,
        request.capability.split('-')[0]
      );

      if (snippets.length === 0) {
        return {
          success: true,
          summary: '',
          disclaimer:
            'Geen cohort-patronen beschikbaar voor deze capability. Schakel federated execution en agent patterns in.',
          requestId,
        };
      }

      const rawSummary = [
        `Cohort insight (${request.capability}):`,
        ...snippets.slice(0, 5).map((s) => `- ${s}`),
      ].join('\n');

      const summary = this.distiller.distill(rawSummary);
      const summaryHash = crypto.createHash('sha256').update(summary).digest('hex');

      await prisma.federatedExecutionAudit.create({
        data: {
          tenantId: request.tenantId,
          requestId,
          sourceAgentKey: request.sourceAgentKey,
          capability: request.capability,
          summaryHash,
          summary,
          sourceDeploymentId: getFederatedDeploymentId(),
          queryHintHash: queryHintHash ?? null,
          responseLatencyMs: Date.now() - start,
        },
      });

      return {
        success: true,
        summary,
        disclaimer:
          'Federated sandbox — anonymized cohort patterns only. Query hint is hashed locally, not sent cross-tenant.',
        requestId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Federated sandbox failed';
      return { success: false, error: message };
    }
  }
}
