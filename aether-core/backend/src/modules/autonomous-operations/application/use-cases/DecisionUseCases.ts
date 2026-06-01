import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { eventBus } from '../../../../shared/events/eventBus';
import { DecisionRepository } from '../../domain/repositories/DecisionRepository';

export class ListDecisionsUseCase {
  constructor(private repository: DecisionRepository) {}

  async execute(tenantId: string) {
    const tid = requireTenantId(tenantId, 'ListDecisionsUseCase.execute');
    return this.repository.findAll(tid);
  }
}

export class GetDecisionUseCase {
  constructor(private repository: DecisionRepository) {}

  async execute(id: string, tenantId: string) {
    const tid = requireTenantId(tenantId, 'GetDecisionUseCase.execute');
    return this.repository.findById(id, tid);
  }
}

export class CreateDecisionUseCase {
  constructor(private repository: DecisionRepository) {}

  async execute(
    data: { type: string; result: string; rationale?: string },
    ctx: { tenantId: string; actorId?: string }
  ) {
    const tid = requireTenantId(ctx.tenantId, 'CreateDecisionUseCase.execute');
    const decision = await this.repository.create({
      tenantId: tid,
      type: data.type,
      result: data.result,
      rationale: data.rationale,
      actor: ctx.actorId,
    });
    await writeAuditLog({
      tenantId: tid,
      module: 'autonomous-operations',
      action: 'decision_created',
      actor: ctx.actorId,
      details: { type: data.type, result: data.result },
    });
    await eventBus.publish({
      tenantId: tid,
      type: 'decision.executed',
      payload: { decisionId: decision.id, type: data.type },
    });
    return decision;
  }
}
