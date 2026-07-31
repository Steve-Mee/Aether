import { createIntelligenceLayer } from '../../ai/intelligence/createIntelligenceLayer';
import type { IntelligenceLayer } from '../../ai/intelligence/createIntelligenceLayer';
import { ExecuteBrainToolUseCase } from '../../modules/admin-command-bar/application/use-cases/ExecuteBrainToolUseCase';
import { ResumeBrainAgentRunUseCase } from '../../ai/intelligence/command-brain/ResumeBrainAgentRunUseCase';
import { BrainToolKnowledgeTransferService } from '../../ai/intelligence/command-brain/BrainToolKnowledgeTransferService';
import { BrainToolApprovalHandler } from '../../shared/approval/handlers/brainToolApprovalHandler';
import { registerBrainToolApprovalHandler } from '../../shared/approval/approvalExecutor';
import { BilateralExchangeService } from '../../modules/bilateral-exchange/application/BilateralExchangeService';
import { BilateralExportBuilder } from '../../modules/bilateral-exchange/application/BilateralExportBuilder';
import { BilateralImportAdapter } from '../../modules/bilateral-exchange/application/BilateralImportAdapter';
import { PrismaBilateralExchangeRepository } from '../../modules/bilateral-exchange/infrastructure/persistence/PrismaBilateralExchangeRepository';
import { PrismaBilateralExportDataAdapter } from '../../modules/bilateral-exchange/infrastructure/persistence/PrismaBilateralExportDataAdapter';

import { type BootstrapContext, privacyBudgetService } from './bootstrapContext';

export interface IntelligenceWiring {
  intelligence: IntelligenceLayer;
  executeBrainTool: ExecuteBrainToolUseCase;
  resumeBrainAgentRun: ResumeBrainAgentRunUseCase | undefined;
  bilateralExchangeService: BilateralExchangeService;
}

export function wireIntelligence(ctx: BootstrapContext): IntelligenceWiring {
  const intelligence = createIntelligenceLayer({
    submitInsight: ctx.submitInsight,
    queryInsights: ctx.queryInsights,
    privacyBudgetService,
    adminData: ctx.adminData,
    dynamicPricingEngine: ctx.pricingEngine,
    decisionRepository: ctx.decisionRepo,
  });

  const bilateralExchangeRepository = new PrismaBilateralExchangeRepository();
  const bilateralExportBuilder = new BilateralExportBuilder(new PrismaBilateralExportDataAdapter());
  const bilateralExchangeService = new BilateralExchangeService(
    new BilateralImportAdapter(intelligence.personalBrainRegistry),
    bilateralExchangeRepository,
    bilateralExportBuilder
  );

  const brainToolKt = new BrainToolKnowledgeTransferService(intelligence.knowledgeContributionService);
  const executeBrainTool = new ExecuteBrainToolUseCase(
    intelligence.toolRegistry!,
    intelligence.personalBrainRegistry,
    intelligence.adaptiveLearning,
    brainToolKt
  );
  const resumeBrainAgentRun = intelligence.agentLoop
    ? new ResumeBrainAgentRunUseCase(intelligence.agentLoop, intelligence.personalBrainMemory)
    : undefined;
  if (intelligence.toolRegistry) {
    registerBrainToolApprovalHandler(
      new BrainToolApprovalHandler(
        intelligence.toolRegistry,
        intelligence.adaptiveLearning,
        brainToolKt,
        resumeBrainAgentRun
      )
    );
  }

  return {
    intelligence,
    executeBrainTool,
    resumeBrainAgentRun,
    bilateralExchangeService,
  };
}
