import type { AdminDataPort } from '../../../admin-command-bar/application/ports/AdminDataPort';
import type { PeerDelegationBridge } from '../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';
import type { ProactiveSuggestionService } from '../../../../ai/intelligence/proactive/ProactiveSuggestionService';
import { isInventoryPeerEnabled } from '../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';
import { isPromotionPeerEnabled } from '../../../../ai/intelligence/multi-agent/supervisorConfig';
import {
  isProactiveDetectionOrchestrationEnabled,
  isProactiveDetectionUnifyPeer,
} from '../../../../ai/intelligence/proactive/proactiveConfig';
import { createCorrelationId } from '../../../../ai/intelligence/multi-agent/peer/AgentPeerMessage';
import { eventBus } from '../../../../shared/events/eventBus';
import { logger } from '../../../../shared/logging/logger';

const DEFAULT_THRESHOLD = 10;

export class MonitorLowStockUseCase {
  constructor(
    private adminData: AdminDataPort,
    private peerBridge?: PeerDelegationBridge,
    private proactiveService?: ProactiveSuggestionService
  ) {}

  async execute(ctx: { tenantId: string; actorId?: string; threshold?: number }): Promise<{
    lowStockCount: number;
    peerHandoffTriggered: boolean;
  }> {
    const threshold = ctx.threshold ?? DEFAULT_THRESHOLD;
    const items = await this.adminData.listLowStockInventory(ctx.tenantId, threshold);

    if (items.length === 0) {
      return { lowStockCount: 0, peerHandoffTriggered: false };
    }

    const lowStockSkus = items.slice(0, 10).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      warehouseId: item.warehouseId,
    }));
    const suggestedPricingActions = items.slice(0, 5).map((item) => ({
      productId: item.productId,
      action: 'suggest_clearance_pricing' as const,
      reason: `Low stock (${item.quantity} units) — clearance or promotion recommended`,
    }));

    await eventBus.publish({
      tenantId: ctx.tenantId,
      type: 'inventory.low_stock_detected',
      payload: {
        threshold,
        lowStockCount: items.length,
        lowStockSkus,
      },
    });

    if (this.proactiveService) {
      void this.proactiveService
        .evaluateAndIngestEvent(ctx.tenantId, 'inventory.low_stock_detected', {
          threshold,
          lowStockCount: items.length,
          lowStockSkus,
        })
        .catch(() => undefined);
    }

    let peerHandoffTriggered = false;
    const skipPeerForProactive =
      isProactiveDetectionUnifyPeer() && isProactiveDetectionOrchestrationEnabled();
    if (isInventoryPeerEnabled() && this.peerBridge?.isAvailable() && !skipPeerForProactive) {
      try {
        const correlationId = createCorrelationId();
        const usePromotion = isPromotionPeerEnabled();
        const targetAgentKey = usePromotion ? 'promotion' : 'pricing';
        const intent = usePromotion ? 'CLEARANCE_PRICING' : 'PRICING_OPTIMIZE';
        await this.peerBridge.chainHandoff({
          tenantId: ctx.tenantId,
          fromAgentKey: 'inventory',
          toAgentKey: targetAgentKey,
          intent,
          command: `${items.length} low-stock SKU(s) detected — suggest clearance or promotion pricing`,
          context: [],
          actorId: ctx.actorId,
          contextPayload: {
            messageType: 'intel',
            summary: `${items.length} low-stock items need pricing review`,
            payload: { lowStockSkus, suggestedPricingActions, reason: 'clearance_or_promotion' },
            correlationId,
          },
          correlationId,
        });
        peerHandoffTriggered = true;
      } catch (err) {
        logger.warn('inventory_peer_handoff_failed', {
          tenantId: ctx.tenantId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { lowStockCount: items.length, peerHandoffTriggered };
  }
}
