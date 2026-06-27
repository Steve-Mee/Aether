import crypto from 'crypto';
import type { MessageBrokerPort } from '../../../../../shared/messaging/MessageBrokerPort';
import {
  FEDERATED_EXECUTE_RESPONSE_TOPIC,
  FEDERATED_EXECUTE_TOPIC,
  getFederatedDeploymentId,
  isFederatedRpcEnabled,
} from '../../../../../shared/messaging/messagingConfig';
import type { FederatedAgentRequest, FederatedAgentResponse } from './types';
import {
  FederatedDeploymentRegistry,
  hashQueryHint,
  signFederatedPayload,
  verifyFederatedSignature,
} from './FederatedDeploymentRegistry';

const RPC_TIMEOUT_MS = Number(process.env.FEDERATED_RPC_TIMEOUT_MS ?? 30000);

function getSigningSecret(): string {
  return process.env.FEDERATED_SIGNING_SECRET ?? 'dev-federated-secret-change-me';
}

export class FederatedRpcClient {
  private registry = new FederatedDeploymentRegistry();
  private pending = new Map<
    string,
    { resolve: (r: FederatedAgentResponse) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();

  constructor(private broker?: MessageBrokerPort) {}

  registerResponseHandler(): void {
    if (!this.broker) return;
    void this.broker.consume(
      FEDERATED_EXECUTE_RESPONSE_TOPIC,
      'aether-federated-response-listeners',
      async (message) => {
        const response = message.payload as unknown as FederatedAgentResponse;
        const pending = this.pending.get(response.requestId);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(response.requestId);
        const { signature, ...unsigned } = response;
        if (!verifyFederatedSignature(unsigned as Record<string, unknown>, signature, getSigningSecret())) {
          pending.reject(new Error('Invalid federated response signature'));
          return;
        }
        pending.resolve(response);
      }
    );
  }

  async executeRemote(input: {
    tenantId: string;
    sourceAgentKey: string;
    capability: string;
    queryHint?: string;
    targetDeploymentId: string;
    targetTenantId: string;
  }): Promise<FederatedAgentResponse | null> {
    if (!isFederatedRpcEnabled() || !this.broker) return null;

    const requestId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + RPC_TIMEOUT_MS).toISOString();
    const unsigned = {
      requestId,
      sourceDeploymentId: getFederatedDeploymentId(),
      targetDeploymentId: input.targetDeploymentId,
      targetTenantId: input.targetTenantId,
      sourceTenantId: input.tenantId,
      sourceAgentKey: input.sourceAgentKey,
      capability: input.capability,
      queryHintHash: hashQueryHint(input.queryHint),
      expiresAt,
    };
    const request: FederatedAgentRequest = {
      ...unsigned,
      signature: signFederatedPayload(unsigned, getSigningSecret()),
    };

    const responsePromise = new Promise<FederatedAgentResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('Federated RPC timeout'));
      }, RPC_TIMEOUT_MS);
      this.pending.set(requestId, { resolve, reject, timer });
    });

    await this.broker.produce(FEDERATED_EXECUTE_TOPIC, {
      eventId: requestId,
      tenantId: input.tenantId,
      type: 'federated.execute.requested' as never,
      payload: request as unknown as Record<string, unknown>,
      idempotencyKey: requestId,
    });

    try {
      return await responsePromise;
    } catch {
      return null;
    }
  }

  async resolveDeploymentForCapability(capability: string) {
    return this.registry.findForCapability(capability);
  }
}
