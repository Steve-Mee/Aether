import { NegotiationEngine } from '../services/NegotiationEngine';
import { NegotiationRepository } from '../../domain/repositories/NegotiationRepository';
import type { ProductQueryPort } from '../ports/ProductQueryPort';
import { eventBus } from '../../../../shared/events/eventBus';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import type { PeerDelegationBridge } from '../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';
import { isNegotiationPeerEnabled } from '../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';

export class RespondToOfferUseCase {
  constructor(
    private repo: NegotiationRepository,
    private productQuery: ProductQueryPort,
    private engine: NegotiationEngine,
    private peerBridge?: PeerDelegationBridge
  ) {}

  async execute(
    negotiationId: string,
    params: { offer: number; agentId: string },
    ctx: { tenantId: string; actorId?: string }
  ) {
    const tid = requireTenantId(ctx.tenantId, 'RespondToOfferUseCase.execute');
    const negotiation = await this.repo.findById(negotiationId, tid);
    if (!negotiation) throw new Error('Negotiation not found');

    const productPrice = negotiation.productId
      ? await this.productQuery.findPrice(tid, negotiation.productId)
      : null;
    const targetPrice = productPrice ?? negotiation.currentOffer;
    const roundCount = negotiation.history?.length ?? 0;
    const decision = await this.engine.evaluateOffer(
      tid,
      negotiationId,
      params.offer,
      targetPrice,
      0.35,
      roundCount
    );

    await this.repo.addOffer(negotiationId, {
      price: params.offer,
      agentId: params.agentId,
    });

    let status = negotiation.status;
    let counterOffer: number | undefined;

    if (decision === 'COUNTER') {
      counterOffer = this.engine.calculateCounterOffer(params.offer, targetPrice);
      await this.repo.update(negotiationId, { currentOffer: counterOffer, status: 'IN_PROGRESS' });
    } else if (decision === 'ACCEPT') {
      status = 'ACCEPTED';
      await this.repo.update(negotiationId, { status: 'ACCEPTED', currentOffer: params.offer });
    } else {
      status = 'REJECTED';
      await this.repo.update(negotiationId, { status: 'REJECTED' });
    }

    await eventBus.publish({
      tenantId: tid,
      type: 'negotiation.updated',
      payload: { negotiationId, decision, offer: params.offer },
    });

    if (
      isNegotiationPeerEnabled() &&
      this.peerBridge?.isAvailable() &&
      (decision === 'COUNTER' || decision === 'ACCEPT')
    ) {
      try {
        await this.peerBridge.chainHandoff({
          tenantId: tid,
          fromAgentKey: 'negotiation',
          toAgentKey: 'pricing',
          intent: 'PRICING_OPTIMIZE',
          command: `Negotiation ${negotiationId} ${decision} at offer ${params.offer}`,
          context: [],
          actorId: ctx.actorId,
        });
      } catch {
        // Best-effort negotiation peer chain
      }
    }

    return {
      negotiationId,
      decision,
      counterOffer,
      status,
      timestamp: new Date().toISOString(),
    };
  }
}
