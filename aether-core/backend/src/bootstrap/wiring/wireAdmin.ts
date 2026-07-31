import type { SupplierMonitorPort } from '../../modules/admin-command-bar/application/ports/SupplierMonitorPort';
import { MonitorSupplierUseCase } from '../../modules/supplier-intelligence/application/use-cases/MonitorSupplierUseCase';
import { MonitorLowStockUseCase } from '../../modules/inventory-pricing/application/use-cases/MonitorLowStockUseCase';
import { WebScraperService } from '../../modules/supplier-intelligence/application/services/WebScraperService';
import { PriceChangeDetectorService } from '../../modules/supplier-intelligence/application/services/PriceChangeDetectorService';
import { ExecuteNaturalLanguageCommandUseCase } from '../../modules/admin-command-bar/application/use-cases/ExecuteNaturalLanguageCommandUseCase';
import { UiAdoptionMetricsService } from '../../modules/admin-command-bar/application/services/UiAdoptionMetricsService';
import { HandoffOverviewService } from '../../modules/admin-command-bar/application/services/HandoffOverviewService';
import { PrismaUiAdoptionMetricsRepository } from '../../modules/admin-command-bar/infrastructure/persistence/PrismaUiAdoptionMetricsRepository';
import { PrismaSuggestionDataRepository } from '../../modules/admin-command-bar/infrastructure/persistence/PrismaSuggestionDataRepository';
import { PrismaHandoffOverviewRepository } from '../../modules/admin-command-bar/infrastructure/persistence/PrismaHandoffOverviewRepository';
import {
  ProactiveSuggestionRepository,
  ProactiveSuggestionService,
} from '../../ai/intelligence/proactive';
import { ProactiveLearningService } from '../../ai/intelligence/proactive/learning/ProactiveLearningService';
import { ProactiveEnrichmentService } from '../../ai/intelligence/proactive/enrichment/ProactiveEnrichmentService';
import { ProactiveAutoExecuteService } from '../../ai/intelligence/proactive/execution/ProactiveAutoExecuteService';
import { ProactiveNotificationDispatcher } from '../../ai/intelligence/proactive/notifications/ProactiveNotificationDispatcher';
import { ProactivePatternContributionService } from '../../ai/intelligence/proactive/global/ProactivePatternContributionService';
import { ProactiveGlobalHintService } from '../../ai/intelligence/proactive/global/ProactiveGlobalHintService';
import { ProactiveDetectionOrchestrator } from '../../ai/intelligence/proactive/orchestration/ProactiveDetectionOrchestrator';
import { AgentPatternDistillationService } from '../../ai/intelligence/global-knowledge/agent-patterns/AgentPatternDistillationService';
import {
  GoalRepository,
  GoalMetricResolver,
  GoalProgressService,
  GoalService,
  GoalContextProvider,
  GoalSuggestionLinker,
} from '../../ai/intelligence/goals';
import { GoalOutcomeAttributionService } from '../../ai/intelligence/goals/GoalOutcomeAttributionService';
import { GoalSuggestionRepository } from '../../ai/intelligence/goals/suggestions/GoalSuggestionRepository';
import { GoalSuggestionEngine } from '../../ai/intelligence/goals/suggestions/GoalSuggestionEngine';
import { GoalPlanningOrchestrator } from '../../ai/intelligence/goals/planning/GoalPlanningOrchestrator';
import { ActivityFeedService } from '../../modules/admin-command-bar/application/services/ActivityFeedService';
import { AgentRosterService } from '../../modules/admin-command-bar/application/services/AgentRosterService';
import { NotificationInboxService } from '../../modules/admin-command-bar/application/services/NotificationInboxService';
import { NotificationReadStateService } from '../../modules/admin-command-bar/application/services/NotificationReadStateService';
import { OverviewFeedService } from '../../modules/admin-command-bar/application/services/OverviewFeedService';
import { OverviewFeedWriterService } from '../../modules/admin-command-bar/application/services/OverviewFeedWriter';
import { OverviewNotificationDispatcher } from '../../modules/admin-command-bar/application/services/OverviewNotificationDispatcher';
import { NotificationGrouper } from '../../modules/admin-command-bar/application/services/notifications/NotificationGrouper';
import { NotificationWriterService } from '../../modules/admin-command-bar/application/services/notifications/NotificationWriter';
import { NotificationBackfillJob } from '../../modules/admin-command-bar/application/services/jobs/NotificationBackfillJob';
import { NotificationDigestJob } from '../../modules/admin-command-bar/application/services/jobs/NotificationDigestJob';
import { OverviewDigestJob } from '../../modules/admin-command-bar/application/services/jobs/OverviewDigestJob';
import { OverviewFeedBackfillJob } from '../../modules/admin-command-bar/application/services/jobs/OverviewFeedBackfillJob';
import { PrismaActivityFeedRepository } from '../../modules/admin-command-bar/infrastructure/persistence/PrismaActivityFeedRepository';
import { PrismaAgentRosterRepository } from '../../modules/admin-command-bar/infrastructure/persistence/PrismaAgentRosterRepository';
import { PrismaNotificationRepository } from '../../modules/admin-command-bar/infrastructure/persistence/PrismaNotificationRepository';
import { PrismaOverviewFeedRepository } from '../../modules/admin-command-bar/infrastructure/persistence/PrismaOverviewFeedRepository';
import { PrismaTenantDirectoryRepository } from '../../modules/admin-command-bar/infrastructure/persistence/PrismaTenantDirectoryRepository';
import { smtpMailSender } from '../../modules/aether-mail/infrastructure/smtp/SmtpMailSenderAdapter';

import { type BootstrapContext } from './bootstrapContext';
import type { IntelligenceWiring } from './wireIntelligence';

class SupplierMonitorAdapter implements SupplierMonitorPort {
  constructor(private useCase: MonitorSupplierUseCase) {}

  async monitorSupplier(
    supplierId: string,
    ctx: { tenantId: string; actorId?: string }
  ): Promise<{ changeCount: number }> {
    const result = await this.useCase.execute(supplierId, ctx);
    return { changeCount: result?.changes?.length ?? 0 };
  }
}

export interface AdminWiring {
  supplierMonitorAdapter: SupplierMonitorAdapter;
  monitorSupplierUseCase: MonitorSupplierUseCase;
  monitorLowStockUseCase: MonitorLowStockUseCase;
  uiAdoptionMetricsService: UiAdoptionMetricsService;
  handoffOverviewService: HandoffOverviewService;
  suggestionDataRepository: PrismaSuggestionDataRepository;
  proactiveSuggestionRepository: ProactiveSuggestionRepository;
  proactiveSuggestionService: ProactiveSuggestionService;
  proactiveLearningService: ProactiveLearningService;
  proactiveEnrichmentService: ProactiveEnrichmentService;
  proactiveAutoExecuteService: ProactiveAutoExecuteService;
  goalRepository: GoalRepository;
  goalContextProvider: GoalContextProvider;
  goalProgressService: GoalProgressService;
  goalService: GoalService;
  goalSuggestionEngine: GoalSuggestionEngine;
  executeNaturalLanguageCommand: ExecuteNaturalLanguageCommandUseCase;
  activityFeedService: ActivityFeedService;
  overviewFeedService: OverviewFeedService;
  overviewFeedWriter: OverviewFeedWriterService;
  overviewNotificationDispatcher: OverviewNotificationDispatcher;
  notificationWriter: NotificationWriterService;
  notificationInboxService: NotificationInboxService;
  notificationReadStateService: NotificationReadStateService;
  agentRosterService: AgentRosterService | undefined;
  notificationBackfillJob: NotificationBackfillJob;
  notificationDigestJob: NotificationDigestJob;
  overviewDigestJob: OverviewDigestJob;
  overviewFeedBackfillJob: OverviewFeedBackfillJob;
}

export function wireAdmin(ctx: BootstrapContext, intel: IntelligenceWiring): AdminWiring {
  const { intelligence, executeBrainTool } = intel;

  const uiAdoptionMetricsService = new UiAdoptionMetricsService(new PrismaUiAdoptionMetricsRepository());
  const handoffOverviewService = new HandoffOverviewService(new PrismaHandoffOverviewRepository());
  const suggestionDataRepository = new PrismaSuggestionDataRepository();
  const proactiveSuggestionRepository = new ProactiveSuggestionRepository();
  const goalRepository = new GoalRepository();
  const goalMetricResolver = new GoalMetricResolver(ctx.adminData);
  const goalContextProvider = new GoalContextProvider(goalRepository);
  const goalSuggestionLinker = new GoalSuggestionLinker(goalRepository);
  const proactiveLearningService = new ProactiveLearningService(intelligence.personalBrainRegistry);
  const proactiveGlobalHintService = new ProactiveGlobalHintService();
  const proactiveGlobalContributionService = new ProactivePatternContributionService(
    new AgentPatternDistillationService()
  );
  const proactiveEnrichmentService = new ProactiveEnrichmentService(
    proactiveSuggestionRepository,
    ctx.adminData,
    proactiveGlobalHintService
  );
  const proactiveNotificationDispatcher = new ProactiveNotificationDispatcher();
  const proactiveDetectionOrchestrator = new ProactiveDetectionOrchestrator(
    proactiveSuggestionRepository,
    intelligence.agentSupervisor
  );
  const proactiveSuggestionService = new ProactiveSuggestionService(
    proactiveSuggestionRepository,
    ctx.adminData,
    undefined,
    {
      learning: proactiveLearningService,
      enrichment: proactiveEnrichmentService,
      notifications: proactiveNotificationDispatcher,
      globalContribution: proactiveGlobalContributionService,
      globalHints: proactiveGlobalHintService,
      detectionOrchestrator: proactiveDetectionOrchestrator,
      goalLinker: goalSuggestionLinker,
    }
  );

  const goalOutcomeAttributionService = new GoalOutcomeAttributionService();
  const goalSuggestionRepository = new GoalSuggestionRepository();
  const goalSuggestionEngine = new GoalSuggestionEngine(ctx.adminData, goalSuggestionRepository);
  const goalPlanningOrchestrator = new GoalPlanningOrchestrator(goalRepository);

  const goalProgressService = new GoalProgressService(
    goalRepository,
    goalMetricResolver,
    proactiveSuggestionService,
    goalOutcomeAttributionService
  );
  const goalService = new GoalService(
    goalRepository,
    goalMetricResolver,
    goalProgressService,
    proactiveSuggestionRepository,
    proactiveSuggestionService,
    goalOutcomeAttributionService,
    goalSuggestionRepository,
    goalSuggestionEngine,
    goalPlanningOrchestrator
  );

  const monitorSupplierUseCase = new MonitorSupplierUseCase(
    ctx.supplierRepo,
    new WebScraperService(),
    new PriceChangeDetectorService(),
    ctx.supplierDecisionEngine,
    ctx.supplierChangePort,
    intelligence.personalBrainRegistry,
    intelligence.peerDelegationBridge,
    proactiveSuggestionService
  );

  const monitorLowStockUseCase = new MonitorLowStockUseCase(
    ctx.adminData,
    intelligence.peerDelegationBridge,
    proactiveSuggestionService
  );

  const supplierMonitorAdapter = new SupplierMonitorAdapter(monitorSupplierUseCase);
  intelligence.toolRegistry?.setSupplierMonitor(supplierMonitorAdapter);

  const executeNaturalLanguageCommand = new ExecuteNaturalLanguageCommandUseCase(
    supplierMonitorAdapter,
    ctx.adminData,
    ctx.commandLog,
    {
      agentRuntime: intelligence.agentRuntime,
      commandBrain: intelligence.commandBrainService,
      brainResponse: intelligence.brainResponseService,
      personalBrainRegistry: intelligence.personalBrainRegistry,
      merchantKnowledgeIndexer: intelligence.merchantKnowledgeIndexer,
      adaptiveLearning: intelligence.adaptiveLearning,
      executeBrainTool,
      globalBrain: intelligence.globalBrain,
      knowledgeTransfer: intelligence.knowledgeTransfer,
      knowledgeContributionService: intelligence.knowledgeContributionService,
      globalKnowledgeService: intelligence.globalKnowledgeService,
      planMemory: intelligence.planMemoryService,
      personalBrainMemory: intelligence.personalBrainMemory,
      agentSupervisor: intelligence.agentSupervisor,
      multiAgentResultAggregator: intelligence.multiAgentResultAggregator,
      runMemoryPromoter: intelligence.runMemoryPromoter,
      runWorkingMemory: intelligence.runWorkingMemory,
      reflectionExperimentService: intelligence.reflectionExperimentService,
      reflectionMetricsRecorder: intelligence.reflectionMetricsRecorder,
      reflectionDistillationService: intelligence.reflectionDistillationService,
      agentPatternSync: intelligence.agentPatternSync,
      goalContextProvider,
    }
  );

  const proactiveAutoExecuteService = new ProactiveAutoExecuteService(
    proactiveSuggestionRepository,
    proactiveLearningService,
    executeNaturalLanguageCommand
  );
  proactiveSuggestionService.setAutoExecute(proactiveAutoExecuteService);

  const tenantDirectory = new PrismaTenantDirectoryRepository();
  const activityFeedRepository = new PrismaActivityFeedRepository();
  const notificationRepository = new PrismaNotificationRepository();
  const overviewFeedRepository = new PrismaOverviewFeedRepository();
  const agentRosterRepository = new PrismaAgentRosterRepository();

  const activityFeedService = new ActivityFeedService(activityFeedRepository);
  const overviewFeedWriter = new OverviewFeedWriterService(overviewFeedRepository);
  const overviewFeedService = new OverviewFeedService(overviewFeedRepository, activityFeedService);
  const overviewNotificationDispatcher = new OverviewNotificationDispatcher(
    overviewFeedRepository,
    smtpMailSender,
  );
  const notificationGrouper = new NotificationGrouper(notificationRepository);
  const notificationWriter = new NotificationWriterService(notificationRepository, notificationGrouper);
  const notificationReadStateService = new NotificationReadStateService(notificationRepository);
  const notificationInboxService = new NotificationInboxService(
    notificationRepository,
    overviewFeedRepository,
    activityFeedService,
    notificationReadStateService,
    notificationWriter,
  );
  const agentRosterService = intelligence.agentRegistry
    ? new AgentRosterService(
        intelligence.agentRegistry,
        agentRosterRepository,
        activityFeedService,
      )
    : undefined;

  const notificationBackfillJob = new NotificationBackfillJob(
    tenantDirectory,
    notificationInboxService,
  );
  const notificationDigestJob = new NotificationDigestJob(
    tenantDirectory,
    notificationRepository,
    overviewNotificationDispatcher,
    notificationWriter,
  );
  const overviewDigestJob = new OverviewDigestJob(tenantDirectory, overviewNotificationDispatcher);
  const overviewFeedBackfillJob = new OverviewFeedBackfillJob(
    tenantDirectory,
    activityFeedRepository,
    overviewFeedRepository,
    new PrismaHandoffOverviewRepository(),
    overviewFeedWriter,
    overviewFeedService,
  );

  return {
    supplierMonitorAdapter,
    monitorSupplierUseCase,
    monitorLowStockUseCase,
    uiAdoptionMetricsService,
    handoffOverviewService,
    suggestionDataRepository,
    proactiveSuggestionRepository,
    proactiveSuggestionService,
    proactiveLearningService,
    proactiveEnrichmentService,
    proactiveAutoExecuteService,
    goalRepository,
    goalContextProvider,
    goalProgressService,
    goalService,
    goalSuggestionEngine,
    executeNaturalLanguageCommand,
    activityFeedService,
    overviewFeedService,
    overviewFeedWriter,
    overviewNotificationDispatcher,
    notificationWriter,
    notificationInboxService,
    notificationReadStateService,
    agentRosterService,
    notificationBackfillJob,
    notificationDigestJob,
    overviewDigestJob,
    overviewFeedBackfillJob,
  };
}

export { SupplierMonitorAdapter };
