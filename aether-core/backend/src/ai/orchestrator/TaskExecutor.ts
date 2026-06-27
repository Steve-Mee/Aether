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
          autoSent: ctx.input.autoSent === true,
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

    case 'pricing.adjust': {
      const productId = ctx.input.productId as string | undefined;
      const percentage = ctx.input.percentage as number | undefined;
      if (!productId || percentage == null) {
        return { ...ctx.input, executed: false, reason: 'missing productId or percentage' };
      }
      const updated = await getCompositionRoot().adminData.updateProductPrices(
        ctx.tenantId,
        percentage
      );
      return { productId, percentage, updated, executed: true };
    }

    case 'brain.recall': {
      const query = String(ctx.input.query ?? '');
      if (!query) return { ...ctx.input, executed: false, reason: 'missing query' };
      const agentKey = String(ctx.input.agentKey ?? 'admin');
      const recall = await getCompositionRoot().personalBrainRegistry
        .get(ctx.tenantId, agentKey)
        .recall(query);
      return { snippets: recall.snippets, matches: recall.matches, executed: true };
    }

    case 'brain.remember': {
      const agentKey = String(ctx.input.agentKey ?? 'admin');
      const brain = getCompositionRoot().personalBrainRegistry.get(ctx.tenantId, agentKey);
      await brain.remember({
        command: String(ctx.input.command ?? ''),
        intent: String(ctx.input.intent ?? 'UNKNOWN'),
        result: String(ctx.input.result ?? ''),
      });
      return { remembered: true, executed: true };
    }

    case 'insight.submit': {
      const insights = ctx.input.insights as Array<{
        category: string;
        metric: string;
        value: number;
        sampleSize?: number;
      }> | undefined;
      if (!insights?.length) {
        return { ...ctx.input, executed: false, reason: 'missing insights' };
      }
      const result = await getCompositionRoot().knowledgeContributionService.submitInsights(
        ctx.tenantId,
        insights,
        'orchestrator'
      );
      return { ...result, executed: true };
    }

    case 'knowledge.contribute': {
      const root = getCompositionRoot();
      const result = await root.knowledgeContributionService.contributeFromRecentLogs(ctx.tenantId);
      return { ...result, executed: true };
    }

    case 'knowledge.pull': {
      const root = getCompositionRoot();
      const updates = await root.knowledgeTransfer.getKnowledgeUpdates(ctx.tenantId);
      const syncResult = await root.globalKnowledgeService.syncForTenant(ctx.tenantId);
      return { ...updates, syncResult, executed: true };
    }

    case 'knowledge.distill': {
      const root = getCompositionRoot();
      const result = await root.knowledgeDistillationService.distillFromTenant(ctx.tenantId);
      return { ...result, executed: true };
    }

    case 'knowledge.federate': {
      const root = getCompositionRoot();
      if (process.env.INTELLIGENCE_SECAGG_ENABLED === 'true') {
        const upserted = await root.secAggRoundService.finalizeReadyRounds();
        return { upserted, mode: 'secagg', executed: true };
      }
      const upserted = await root.crossTenantSubmitPipeline.refreshFromTenantInsights();
      return { upserted, mode: 'plaintext', executed: true };
    }

    case 'knowledge.experiment.record': {
      const root = getCompositionRoot();
      const metric = String(ctx.input.metric ?? 'goal_reached');
      const value = Number(ctx.input.value ?? 0);
      await root.globalKnowledgeService.getExperimentService().recordOutcome(
        ctx.tenantId,
        metric,
        value
      );
      return { recorded: true, metric, value, executed: true };
    }

    case 'command.brain.prepare': {
      const command = String(ctx.input.command ?? '');
      if (!command) return { ...ctx.input, executed: false, reason: 'missing command' };
      const root = getCompositionRoot();
      if (!root.commandBrainService) {
        return { contextSnippets: [], recallMatches: [], executed: true, mode: 'no_brain_service' };
      }
      const prepared = await root.commandBrainService.prepareCommand({
        tenantId: ctx.tenantId,
        command,
        actorId: ctx.actorId,
      });
      return { ...prepared, executed: true };
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
