import { NegotiationRepository } from '../../domain/repositories/NegotiationRepository';
import { eventBus } from '../../../../shared/events/eventBus';
import { writeAuditLog } from '../../../../shared/audit/auditService';

export class StartNegotiationUseCase {
  constructor(private repo: NegotiationRepository) {}

  async execute(
    params: {
      customerAgentId: string;
      merchantAgentId: string;
      productId: string;
      initialOffer: number;
    },
    ctx: { tenantId: string; actorId?: string }
  ) {
    const negotiation = await this.repo.create({
      tenantId: ctx.tenantId,
      customerAgentId: params.customerAgentId,
      merchantAgentId: params.merchantAgentId,
      productId: params.productId,
      status: 'IN_PROGRESS',
      currentOffer: params.initialOffer,
    });

    await this.repo.addOffer(negotiation.id, {
      price: params.initialOffer,
      agentId: params.customerAgentId,
      conditions: 'initial',
    });

    await eventBus.publish({
      tenantId: ctx.tenantId,
      type: 'negotiation.updated',
      payload: { negotiationId: negotiation.id, offer: params.initialOffer },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'agentic-commerce',
      action: 'negotiation_started',
      actor: ctx.actorId,
      details: { negotiationId: negotiation.id },
    });

    return negotiation;
  }
}

export class GetNegotiationUseCase {
  constructor(private repo: NegotiationRepository) {}

  async execute(id: string, tenantId: string) {
    return this.repo.findById(id, tenantId);
  }
}

export class ListActiveNegotiationsUseCase {
  constructor(private repo: NegotiationRepository) {}

  async execute(tenantId: string) {
    return this.repo.findActive(tenantId);
  }
}
