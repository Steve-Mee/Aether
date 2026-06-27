import crypto from 'crypto';
import type { AgentPatternSyncService } from '../../../global-knowledge/agent-patterns/AgentPatternSyncService';
import { SummaryDistiller } from './SummaryDistiller';
import { FederatedExecutionGate } from './FederatedExecutionGate';
import { getFederatedDeploymentId } from '../../../../../shared/messaging/messagingConfig';
import { verifyFederatedSignature, signFederatedPayload } from './FederatedDeploymentRegistry';
import type { FederatedAgentRequest, FederatedAgentResponse } from './types';
import type { MessageBrokerPort } from '../../../../../shared/messaging/MessageBrokerPort';
import { FEDERATED_EXECUTE_RESPONSE_TOPIC } from '../../../../../shared/messaging/messagingConfig';
import { prisma } from '../../../../../shared/prisma/client';

function getSigningSecretFromEnv(): string {
  return process.env.FEDERATED_SIGNING_SECRET ?? 'dev-federated-secret-change-me';
}

export class FederatedExecutionWorker {
  private distiller = new SummaryDistiller();

  constructor(
    private agentPatternSync: AgentPatternSyncService,
    private gate: FederatedExecutionGate,
    private broker?: MessageBrokerPort
  ) {}

  async handleRequest(request: FederatedAgentRequest): Promise<FederatedAgentResponse> {
    const { signature, ...unsigned } = request;
    if (!verifyFederatedSignature(unsigned as Record<string, unknown>, signature, getSigningSecretFromEnv())) {
      return this.errorResponse(request, 'Invalid request signature');
    }
    if (new Date(request.expiresAt).getTime() < Date.now()) {
      return this.errorResponse(request, 'Request expired');
    }
    if (request.targetDeploymentId !== getFederatedDeploymentId()) {
      return this.errorResponse(request, 'Wrong target deployment');
    }

    const start = Date.now();
    const enabled = await this.gate.isConsumerEnabled(request.targetTenantId);
    if (!enabled) {
      return this.errorResponse(request, 'Federated execution disabled for target tenant');
    }

    const snippets = await this.agentPatternSync.getContextSnippets(
      request.targetTenantId,
      request.capability.split('-')[0]
    );

    const rawSummary =
      snippets.length === 0
        ? ''
        : [
            `Remote cohort insight (${request.capability}):`,
            ...snippets.slice(0, 5).map((s) => `- ${s}`),
          ].join('\n');

    const summary = this.distiller.distill(rawSummary);
    const summaryHash = crypto.createHash('sha256').update(summary).digest('hex');
    const remoteExecutionRef = crypto.randomUUID();

    await prisma.federatedExecutionAudit.upsert({
      where: { requestId: request.requestId },
      create: {
        tenantId: request.targetTenantId,
        requestId: request.requestId,
        sourceAgentKey: request.sourceAgentKey,
        capability: request.capability,
        summaryHash,
        summary,
        sourceDeploymentId: request.sourceDeploymentId,
        targetDeploymentId: request.targetDeploymentId,
        remoteExecutionRef,
        responseLatencyMs: Date.now() - start,
        queryHintHash: request.queryHintHash ?? null,
      },
      update: {
        summaryHash,
        summary,
        responseLatencyMs: Date.now() - start,
      },
    });

    const unsignedResponse = {
      requestId: request.requestId,
      sourceDeploymentId: request.sourceDeploymentId,
      targetDeploymentId: request.targetDeploymentId,
      success: true,
      summary,
      summaryHash,
      remoteExecutionRef,
    };

    return {
      ...unsignedResponse,
      signature: signFederatedPayload(unsignedResponse, getSigningSecretFromEnv()),
    };
  }

  async publishResponse(response: FederatedAgentResponse, tenantId: string): Promise<void> {
    if (!this.broker) return;
    await this.broker.produce(FEDERATED_EXECUTE_RESPONSE_TOPIC, {
      eventId: response.requestId,
      tenantId,
      type: 'federated.execute.response' as never,
      payload: response as unknown as Record<string, unknown>,
      idempotencyKey: `${response.requestId}:response`,
    });
  }

  private errorResponse(request: FederatedAgentRequest, error: string): FederatedAgentResponse {
    const unsigned = {
      requestId: request.requestId,
      sourceDeploymentId: request.sourceDeploymentId,
      targetDeploymentId: request.targetDeploymentId,
      success: false,
      error,
    };
    return {
      ...unsigned,
      signature: signFederatedPayload(unsigned, getSigningSecretFromEnv()),
    };
  }
}
