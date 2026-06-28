import { DynamicPricingEngine } from '../services/DynamicPricingEngine';
import { InventoryRepository } from '../../domain/repositories/InventoryRepository';
import type { PeerDelegationBridge } from '../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';
import { isInventoryPeerEnabled } from '../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';
import { createCorrelationId } from '../../../../ai/intelligence/multi-agent/peer/AgentPeerMessage';

export class ApplyDynamicPriceUseCase {
  constructor(
    private engine: DynamicPricingEngine,
    private repo: InventoryRepository,
    private peerBridge?: PeerDelegationBridge
  ) {}

  async execute(
    tenantId: string,
    productId: string,
    basePrice: number,
    reason: string = 'AUTOMATIC',
    actorId?: string
  ): Promise<number> {
    const optimalPrice = await this.engine.calculateOptimalPrice(tenantId, productId, basePrice);
    await this.engine.applyPriceChange(tenantId, productId, optimalPrice, reason);

    if (isInventoryPeerEnabled() && this.peerBridge?.isAvailable()) {
      const changePct = basePrice > 0 ? ((optimalPrice - basePrice) / basePrice) * 100 : 0;
      if (Math.abs(changePct) >= 1) {
        try {
          const correlationId = createCorrelationId();
          await this.peerBridge.chainHandoff({
            tenantId,
            fromAgentKey: 'pricing',
            toAgentKey: 'inventory',
            intent: 'INVENTORY_STATUS',
            command: `Price change ${changePct.toFixed(1)}% on product ${productId}`,
            context: [],
            actorId,
            correlationId,
            contextPayload: {
              messageType: 'intel',
              summary: `Verify stock after ${changePct.toFixed(1)}% price change on ${productId}`,
              payload: { productId, changePct: Math.round(changePct * 10) / 10 },
              correlationId,
            },
          });
        } catch {
          // Best-effort inventory peer chain
        }
      }
    }

    return optimalPrice;
  }
}
