import { OrchestratorContext } from './Orchestrator';
import { logger } from '../../shared/logging/logger';

export async function executeOrchestratorTask(
  ctx: OrchestratorContext
): Promise<Record<string, unknown>> {
  const { getCompositionRoot } = await import('../../bootstrap/compositionRoot');

  switch (ctx.task) {
    case 'mail.classify': {
      const root = getCompositionRoot();
      if (ctx.input.emailId) {
        const email = await root.emailRepository.findById(
          String(ctx.input.emailId),
          ctx.tenantId
        );
        return {
          emailId: ctx.input.emailId,
          category: ctx.input.category,
          status: email?.status,
          executed: Boolean(email),
        };
      }
      if (ctx.input.from) {
        const result = await root.processIncomingEmailUseCase.execute(
          {
            from: String(ctx.input.from),
            subject: ctx.input.subject as string | undefined,
            body: ctx.input.body as string | undefined,
            messageId: ctx.input.messageId as string | undefined,
          },
          { tenantId: ctx.tenantId, actorId: ctx.actorId }
        );
        return { emailId: result.id, status: result.status, executed: true };
      }
      return { ...ctx.input, executed: false, reason: 'missing emailId or from' };
    }

    case 'supplier.sync': {
      const supplierId = ctx.input.supplierId as string | undefined;
      if (supplierId && ctx.input.productsFound != null) {
        return {
          supplierId,
          productsFound: ctx.input.productsFound,
          executed: true,
          mode: 'already_executed',
        };
      }
      if (!supplierId) {
        return { ...ctx.input, executed: false, reason: 'missing supplierId' };
      }
      const result = await getCompositionRoot().monitorSupplierUseCase.execute(supplierId, {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
      });
      return {
        supplierId,
        changeCount: result?.changes?.length ?? 0,
        executed: true,
      };
    }

    case 'admin.command': {
      if (ctx.input.intent) {
        return {
          intent: ctx.input.intent,
          command: ctx.input.command,
          executed: true,
          mode: 'already_executed',
        };
      }
      const command = ctx.input.command as string | undefined;
      if (!command) {
        return { ...ctx.input, executed: false, reason: 'missing command' };
      }
      const result = await getCompositionRoot().executeNaturalLanguageCommand.execute(command, {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
      });
      return { ...result, executed: true };
    }

    case 'negotiation.step': {
      const negotiationId = ctx.input.negotiationId as string | undefined;
      const offer = ctx.input.offer as number | undefined;
      if (!negotiationId || offer == null) {
        return { ...ctx.input, executed: false, reason: 'missing negotiationId or offer' };
      }
      const result = await getCompositionRoot().respondToOffer.execute(
        negotiationId,
        { offer, agentId: String(ctx.input.agentId ?? 'orchestrator') },
        { tenantId: ctx.tenantId }
      );
      return { ...result, executed: true };
    }

    default:
      logger.warn('orchestrator_unknown_task', { task: ctx.task });
      return { ...ctx.input, executed: false, reason: 'unknown task' };
  }
}
