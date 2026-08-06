import { RespondToOfferUseCase } from '../../modules/agentic-commerce/application/use-cases/RespondToOfferUseCase';
import { NegotiationSessionOrchestrator } from '../../ai/intelligence/multi-agent/negotiation/NegotiationSessionOrchestrator';
import { proposeCounterOfferTool } from '../../ai/intelligence/multi-agent/agents/negotiationTools';
import {
  createPromotionTool,
  suggestPromotionTool,
  suggestClearancePricingTool,
  suggestBundleTool,
  suggestCampaignChannelTool,
} from '../../ai/intelligence/multi-agent/agents/promotionTools';
import {
  StartNegotiationUseCase,
  GetNegotiationUseCase,
  ListActiveNegotiationsUseCase,
} from '../../modules/agentic-commerce/application/use-cases/StartNegotiationUseCase';
import { productQueryAdapter } from '../../modules/agentic-commerce/infrastructure/adapters/PrismaProductQueryAdapter';
import { negotiationEngine } from '../../modules/agentic-commerce/wiring';

import { type BootstrapContext } from './bootstrapContext';
import type { IntelligenceWiring } from './wireIntelligence';

export interface CommerceWiring {
  respondToOfferUseCase: RespondToOfferUseCase;
  negotiationSessionOrchestrator: NegotiationSessionOrchestrator | undefined;
  startNegotiation: StartNegotiationUseCase;
  getNegotiation: GetNegotiationUseCase;
  listActiveNegotiations: ListActiveNegotiationsUseCase;
}

export function wireCommerce(ctx: BootstrapContext, intel: IntelligenceWiring): CommerceWiring {
  const { intelligence } = intel;

  const respondToOfferUseCase = new RespondToOfferUseCase(
    ctx.negotiationRepo,
    productQueryAdapter,
    negotiationEngine,
    intelligence.peerDelegationBridge,
    intelligence.runWorkingMemory
  );

  if (intelligence.toolRegistry) {
    const promotionDeps = { adminData: ctx.adminData, createPromotion: ctx.createPromotion };
    intelligence.toolRegistry.register(
      proposeCounterOfferTool({ adminData: ctx.adminData, respondToOffer: respondToOfferUseCase })
    );
    intelligence.toolRegistry.register(suggestPromotionTool(promotionDeps));
    intelligence.toolRegistry.register(suggestClearancePricingTool(promotionDeps));
    intelligence.toolRegistry.register(suggestBundleTool(promotionDeps));
    intelligence.toolRegistry.register(suggestCampaignChannelTool(promotionDeps));
    intelligence.toolRegistry.register(createPromotionTool(promotionDeps));
  }

  const negotiationSessionOrchestrator = intelligence.runWorkingMemory
    ? new NegotiationSessionOrchestrator(respondToOfferUseCase, intelligence.runWorkingMemory)
    : undefined;

  return {
    respondToOfferUseCase,
    negotiationSessionOrchestrator,
    startNegotiation: new StartNegotiationUseCase(ctx.negotiationRepo),
    getNegotiation: new GetNegotiationUseCase(ctx.negotiationRepo),
    listActiveNegotiations: new ListActiveNegotiationsUseCase(ctx.negotiationRepo),
  };
}
