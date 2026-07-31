import { NegotiationEngine } from '../services/NegotiationEngine';

import { NegotiationRepository } from '../../domain/repositories/NegotiationRepository';

import type { ProductQueryPort } from '../ports/ProductQueryPort';

import { eventBus } from '../../../../shared/events/eventBus';

import { requireTenantId } from '../../../../shared/tenant/tenantContext';

import type { PeerDelegationBridge } from '../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';

import { isNegotiationPeerEnabled } from '../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';

import { isNotifyPeerEnabled } from '../../../../ai/intelligence/multi-agent/peer/notifyPeerConfig';

import { isRunMemoryEnabled } from '../../../../ai/intelligence/multi-agent/memory/runMemoryConfig';

import type { RunWorkingMemoryPort } from '../../../../ai/intelligence/multi-agent/memory/RunWorkingMemoryPort';

import { createCorrelationId } from '../../../../ai/intelligence/multi-agent/peer/AgentPeerMessage';



export class RespondToOfferUseCase {

  constructor(

    private repo: NegotiationRepository,

    private productQuery: ProductQueryPort,

    private engine: NegotiationEngine,

    private peerBridge?: PeerDelegationBridge,

    private runMemory?: RunWorkingMemoryPort

  ) {}



  async execute(

    negotiationId: string,

    params: { offer: number; agentId: string; parentRunId?: string },

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



    const parentRunId = params.parentRunId;

    if (this.runMemory && parentRunId && isRunMemoryEnabled()) {

      await this.runMemory.set({

        tenantId: tid,

        runId: parentRunId,

        namespace: 'negotiation',

        key: `round:${negotiationId}`,

        value: {

          negotiationId,

          round: roundCount + 1,

          lastDecision: decision,

          lastOffer: counterOffer ?? params.offer,

          status:

            decision === 'ACCEPT' ? 'accepted' : decision === 'REJECT' ? 'rejected' : 'active',

        },

        updatedByAgentKey: 'negotiation',

      });

    }



    await eventBus.publish({

      tenantId: tid,

      type: 'negotiation.updated',

      payload: {

        negotiationId,

        decision,

        offer: params.offer,

        counterOffer,

        parentRunId,

        runId: parentRunId,

        actorId: ctx.actorId,

      },

    });



    if (isNegotiationPeerEnabled() && this.peerBridge?.isAvailable() && (decision === 'COUNTER' || decision === 'ACCEPT')) {

      try {

        const correlationId = createCorrelationId();

        const peerPayload = {

          negotiationId,

          decision,

          offer: params.offer,

          counterOffer,

          round: roundCount + 1,

        };



        if (isNotifyPeerEnabled()) {

          await this.peerBridge.chainHandoff({

            tenantId: tid,

            fromAgentKey: 'negotiation',

            toAgentKey: 'pricing',

            intent: 'PRICING_OPTIMIZE',

            command: `Negotiation ${negotiationId} ${decision} at offer ${params.offer}`,

            context: [],

            actorId: ctx.actorId,

            parentRunId,

            contextPayload: {

              messageType: 'notify',

              summary: `Negotiation ${decision}: offer €${params.offer}`,

              payload: peerPayload,

              correlationId,

            },

            correlationId,

          });

        } else {

          await this.peerBridge.chainHandoff({

            tenantId: tid,

            fromAgentKey: 'negotiation',

            toAgentKey: 'pricing',

            intent: 'PRICING_OPTIMIZE',

            command: `Negotiation ${negotiationId} ${decision} at offer ${params.offer}`,

            context: [],

            actorId: ctx.actorId,

            parentRunId,

            contextPayload: {

              messageType: 'intel',

              summary: `Negotiation ${decision} intel for pricing`,

              payload: peerPayload,

              correlationId,

            },

            correlationId,

          });

        }

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

