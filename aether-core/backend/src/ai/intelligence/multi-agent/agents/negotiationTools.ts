import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface NegotiationToolsDeps {
  adminData: AdminDataPort;
  respondToOffer?: {
    execute(
      negotiationId: string,
      params: { offer: number; agentId: string; parentRunId?: string },
      ctx: { tenantId: string; actorId?: string }
    ): Promise<{ decision: string; counterOffer?: number; status: string }>;
  };
}

export function listActiveNegotiationsTool(deps: NegotiationToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'listActiveNegotiations',
      description: 'List active agentic commerce negotiations',
      parameters: {
        limit: { type: 'number', required: false, description: 'Max negotiations (default 20)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'agentic-commerce',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const limit = Math.min(Number(input.limit ?? 20), 50);
      const negotiations = await deps.adminData.listActiveNegotiations(ctx.tenantId, limit);
      return { success: true, count: negotiations.length, negotiations };
    },
  };
}

export function getNegotiationDetailTool(deps: NegotiationToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getNegotiationDetail',
      description: 'Get negotiation detail including recent offers',
      parameters: {
        negotiationId: { type: 'string', required: true, description: 'Negotiation ID' },
      },
      risk: 'low',
      kind: 'read',
      module: 'agentic-commerce',
    },
    validate(input) {
      if (!String(input.negotiationId ?? '').trim()) {
        return { ok: false, error: 'negotiationId is required' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const detail = await deps.adminData.getNegotiationDetail(
        ctx.tenantId,
        String(input.negotiationId)
      );
      if (!detail) {
        return { success: false, error: 'Negotiation not found' };
      }
      return { success: true, negotiation: detail };
    },
  };
}

export function proposeCounterOfferTool(deps: NegotiationToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'proposeCounterOffer',
      description: 'Propose a counter-offer for an active negotiation',
      parameters: {
        negotiationId: { type: 'string', required: true, description: 'Negotiation ID' },
        price: { type: 'number', required: true, description: 'Counter-offer price' },
        conditions: { type: 'string', required: false, description: 'Optional conditions' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'agentic-commerce',
    },
    validate(input) {
      if (!String(input.negotiationId ?? '').trim()) {
        return { ok: false, error: 'negotiationId is required' };
      }
      const price = Number(input.price);
      if (!Number.isFinite(price) || price <= 0) {
        return { ok: false, error: 'price must be > 0' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'proposeCounterOffer is propose-only' };
    },
    async buildProposal(ctx, input) {
      const negotiationId = String(input.negotiationId);
      const price = Number(input.price);
      const detail = await deps.adminData.getNegotiationDetail(ctx.tenantId, negotiationId);
      const assessment = classifyBrainAction('proposeCounterOffer', input);
      if (!detail) {
        return {
          tool: 'proposeCounterOffer',
          summary: `Negotiation ${negotiationId} not found`,
          risk: assessment.risk,
          requiresApproval: false,
          expectedImpact: assessment.expectedImpact,
          confidence: 0,
          rationale: 'Negotiation not found',
          payload: { negotiationId, price, conditions: String(input.conditions ?? '') },
        };
      }
      return {
        tool: 'proposeCounterOffer',
        summary: `Counter-offer €${price} voor negotiation ${negotiationId}`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: {
          negotiationId,
          price,
          conditions: String(input.conditions ?? ''),
          currentOffer: detail.currentOffer,
        },
      };
    },
    async executeConfirmed(ctx, payload) {
      const p = payload as { negotiationId: string; price: number; conditions?: string };
      if (deps.respondToOffer) {
        const result = await deps.respondToOffer.execute(
          p.negotiationId,
          {
            offer: p.price,
            agentId: ctx.actorId ?? 'negotiation-agent',
            parentRunId: ctx.parentRunId,
          },
          { tenantId: ctx.tenantId, actorId: ctx.actorId }
        );
        return {
          success: true,
          result: `Counter-offer processed: ${result.decision}`,
          negotiationId: p.negotiationId,
          price: p.price,
          decision: result.decision,
          counterOffer: result.counterOffer,
        };
      }
      return {
        success: true,
        result: `Counter-offer €${p.price} queued for negotiation ${p.negotiationId}`,
        negotiationId: p.negotiationId,
        price: p.price,
        note: 'RespondToOfferUseCase not wired',
      };
    },
  };
}
