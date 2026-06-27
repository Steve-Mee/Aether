import { prisma } from '../shared/prisma/client';

import { registerEventHandlers } from './eventHandlers';

import { assertAllRequiredHandlersRegistered } from '../shared/events/eventHandlerRegistry';

import { eventBus } from '../shared/events/eventBus';
import { createMessageBroker } from '../shared/messaging/createMessageBroker';
import { OutboxRelayService, setOutboxRelayService } from '../shared/messaging/OutboxRelayService';

import { PrismaInventoryRepository } from '../modules/inventory-pricing/infrastructure/persistence/PrismaInventoryRepository';

import { PrismaSupplierRepository } from '../modules/supplier-intelligence/infrastructure/persistence/PrismaSupplierRepository';

import { PrismaProductRepository } from '../modules/product-catalog/infrastructure/persistence/PrismaProductRepository';

import { PrismaOrderRepository } from '../modules/order-management/infrastructure/persistence/PrismaOrderRepository';

import { PrismaNegotiationRepository } from '../modules/agentic-commerce/infrastructure/persistence/PrismaNegotiationRepository';

import { PrismaPaymentRepository } from '../modules/payment-fulfillment/infrastructure/persistence/PrismaPaymentRepository';

import { PrismaHiveMindRepository } from '../modules/zero-knowledge-hive-mind/infrastructure/persistence/PrismaHiveMindRepository';

import { WebScraperService } from '../modules/supplier-intelligence/application/services/WebScraperService';

import { PriceChangeDetectorService } from '../modules/supplier-intelligence/application/services/PriceChangeDetectorService';

import { MonitorSupplierUseCase } from '../modules/supplier-intelligence/application/use-cases/MonitorSupplierUseCase';

import { SupplierDecisionEngine } from '../modules/supplier-intelligence/application/services/SupplierDecisionEngine';

import { SupplierWebhookAdapter } from '../modules/supplier-intelligence/infrastructure/adapters/SupplierWebhookAdapter';

import { ExecuteNaturalLanguageCommandUseCase } from '../modules/admin-command-bar/application/use-cases/ExecuteNaturalLanguageCommandUseCase';
import { ExecuteBrainToolUseCase } from '../modules/admin-command-bar/application/use-cases/ExecuteBrainToolUseCase';
import { GetAgentRunUseCase } from '../modules/admin-command-bar/application/use-cases/GetAgentRunUseCase';
import { ResumeBrainAgentRunUseCase } from '../ai/intelligence/command-brain/ResumeBrainAgentRunUseCase';
import { ManagePersonalBrainMemoryUseCase } from '../modules/admin-command-bar/application/use-cases/ManagePersonalBrainMemoryUseCase';
import { GetReflectionTimelineUseCase } from '../modules/admin-command-bar/application/use-cases/GetReflectionTimelineUseCase';
import { ManageReflectionExperimentsUseCase } from '../modules/admin-command-bar/application/use-cases/ManageReflectionExperimentsUseCase';
import { BrainToolKnowledgeTransferService } from '../ai/intelligence/command-brain/BrainToolKnowledgeTransferService';
import { BrainToolApprovalHandler } from '../shared/approval/handlers/brainToolApprovalHandler';
import { registerBrainToolApprovalHandler } from '../shared/approval/approvalExecutor';

import { UndoCommandUseCase } from '../modules/admin-command-bar/application/use-cases/UndoCommandUseCase';

import { SuggestionService } from '../modules/admin-command-bar/application/services/SuggestionService';

import { SupplierMonitorPort } from '../modules/admin-command-bar/application/ports/SupplierMonitorPort';

import { AdminDataPort } from '../modules/admin-command-bar/application/ports/AdminDataPort';

import { PrismaAdminDataAdapter } from '../modules/admin-command-bar/infrastructure/adapters/PrismaAdminDataAdapter';

import { UpdateInventoryUseCase } from '../modules/inventory-pricing/application/use-cases/UpdateInventoryUseCase';

import { DynamicPricingEngine } from '../modules/inventory-pricing/application/services/DynamicPricingEngine';

import { ApplyDynamicPriceUseCase } from '../modules/inventory-pricing/application/use-cases/ApplyDynamicPriceUseCase';

import { ListProductsUseCase } from '../modules/product-catalog/application/use-cases/ListProductsUseCase';

import { CreateProductUseCase } from '../modules/product-catalog/application/use-cases/CreateProductUseCase';

import { CreateOrderUseCase } from '../modules/order-management/application/use-cases/CreateOrderUseCase';

import { UpdateOrderStatusUseCase } from '../modules/order-management/application/use-cases/UpdateOrderStatusUseCase';

import { OrderRepository } from '../modules/order-management/domain/repositories/OrderRepository';

import { SupplierRepository } from '../modules/supplier-intelligence/domain/repositories/SupplierRepository';

import {

  ListDecisionsUseCase,

  CreateDecisionUseCase,

  GetDecisionUseCase,

} from '../modules/autonomous-operations/application/use-cases/DecisionUseCases';

import { PrismaCommandLogAdapter } from '../modules/admin-command-bar/infrastructure/adapters/PrismaCommandLogAdapter';

import { CommandLogPort } from '../modules/admin-command-bar/application/ports/CommandLogPort';

import { paymentGateway } from '../modules/payment-fulfillment/infrastructure/adapters/PaymentGatewayAdapter';

import { RespondToOfferUseCase } from '../modules/agentic-commerce/application/use-cases/RespondToOfferUseCase';

import {

  StartNegotiationUseCase,

  GetNegotiationUseCase,

  ListActiveNegotiationsUseCase,

} from '../modules/agentic-commerce/application/use-cases/StartNegotiationUseCase';

import { PaymentService } from '../modules/payment-fulfillment/application/services/PaymentService';

import { ProcessPaymentUseCase } from '../modules/payment-fulfillment/application/use-cases/ProcessPaymentUseCase';

import { FulfillmentService } from '../modules/payment-fulfillment/application/services/FulfillmentService';

import { PrismaFulfillmentAdapter } from '../modules/payment-fulfillment/infrastructure/adapters/PrismaFulfillmentAdapter';

import { SubmitInsightUseCase } from '../modules/zero-knowledge-hive-mind/application/use-cases/SubmitInsightUseCase';
import { privacyBudgetService } from '../modules/zero-knowledge-hive-mind/wiring';

import { QueryInsightsUseCase } from '../modules/zero-knowledge-hive-mind/application/use-cases/QueryInsightsUseCase';

import { AggregationService } from '../modules/zero-knowledge-hive-mind/application/services/AggregationService';

import { PrismaMerchantCoOwnershipAdapter } from '../modules/merchant-co-ownership/infrastructure/adapters/PrismaMerchantCoOwnershipAdapter';

import { PrismaPhysicalLocationAdapter } from '../modules/physical-digital-symbiosis/infrastructure/adapters/PrismaPhysicalLocationAdapter';

import { PrismaDecisionRepository } from '../modules/autonomous-operations/infrastructure/persistence/PrismaDecisionRepository';

import { PrismaSupplierChangeAdapter } from '../modules/supplier-intelligence/infrastructure/adapters/PrismaSupplierChangeAdapter';

import { SupplierChangePort } from '../modules/supplier-intelligence/application/ports/SupplierChangePort';

import { SupplierOverviewService } from '../modules/supplier-intelligence/application/services/SupplierOverviewService';

import { productQueryAdapter } from '../modules/agentic-commerce/infrastructure/adapters/PrismaProductQueryAdapter';

import { negotiationEngine } from '../modules/agentic-commerce/wiring';

import { paymentIdempotencyAdapter } from '../modules/payment-fulfillment/infrastructure/adapters/PrismaPaymentIdempotencyAdapter';

import { paymentWebhookAdapter } from '../modules/payment-fulfillment/infrastructure/adapters/PrismaPaymentWebhookAdapter';

import { PrismaSelfEvolvingAdapter } from '../modules/self-evolving-codebase/infrastructure/adapters/PrismaSelfEvolvingAdapter';

import { ProcessIncomingEmailUseCase } from '../modules/aether-mail/application/use-cases/ProcessIncomingEmailUseCase';

import { PrismaEmailRepository } from '../modules/aether-mail/infrastructure/persistence/PrismaEmailRepository';

import { EmailClassifierService } from '../modules/aether-mail/application/services/EmailClassifierService';

import { EmailContextProvider } from '../modules/aether-mail/application/services/EmailContextProvider';

import { smtpMailSender } from '../modules/aether-mail/infrastructure/smtp/SmtpMailSenderAdapter';

import { emailContextAdapter } from '../modules/aether-mail/infrastructure/adapters/PrismaEmailContextAdapter';

import { createIntelligenceLayer } from '../ai/intelligence/createIntelligenceLayer';

import type { AgentRuntimePort } from '../ai/intelligence/agent-runtime/AgentRuntimePort';

import type { PersonalBrainRegistry } from '../ai/intelligence/personal-brain/PersonalBrainRegistry';

import type { GlobalBrainPort } from '../ai/intelligence/global-brain/GlobalBrainPort';
import type { GlobalKnowledgeAdminService } from '../ai/intelligence/global-knowledge/GlobalKnowledgeAdminService';
import type { GlobalKnowledgeService } from '../ai/intelligence/global-knowledge/GlobalKnowledgeService';
import type { KnowledgeDistillationService } from '../ai/intelligence/global-knowledge/distillation/KnowledgeDistillationService';
import type { CrossTenantSubmitPipeline } from '../ai/intelligence/global-knowledge/federated/FederatedQueryUseCase';

import type { KnowledgeTransferPort } from '../ai/intelligence/knowledge-transfer/KnowledgeTransferPort';
import type { KnowledgeContributionService } from '../ai/intelligence/knowledge-transfer/contribution/KnowledgeContributionService';
import type { ContributionHistoryService } from '../ai/intelligence/knowledge-transfer/contribution/ContributionHistoryService';
import type { SecAggRoundService } from '../ai/intelligence/global-knowledge/secure-aggregation/SecAggRoundService';

import type { LoRAAdapterRegistryPort } from '../ai/intelligence/personal-brain/LoRAAdapterRegistryPort';

import { BrainMemoryService } from '../ai/intelligence/brain-memory/BrainMemoryService';
import type { CommandBrainService } from '../ai/intelligence/command-brain/CommandBrainService';
import type { AgentSupervisorPort } from '../ai/intelligence/multi-agent/AgentSupervisorPort';
import type { ReflectionDistillationService } from '../ai/intelligence/global-knowledge/distillation/ReflectionDistillationService';
import { ReflectionExperimentService } from '../ai/intelligence/personal-brain/reflection/experiments/ReflectionExperimentService';
import { BilateralExchangeService } from '../modules/bilateral-exchange/application/BilateralExchangeService';
import { BilateralImportAdapter } from '../modules/bilateral-exchange/application/BilateralImportAdapter';
import type { ReflectionMetricsRecorder } from '../ai/intelligence/personal-brain/reflection/ReflectionMetricsRecorder';



export interface AppCompositionRoot {

  executeNaturalLanguageCommand: ExecuteNaturalLanguageCommandUseCase;

  executeBrainTool: ExecuteBrainToolUseCase;

  getAgentRun: GetAgentRunUseCase;

  resumeBrainAgentRun?: ResumeBrainAgentRunUseCase;

  agentRuntime: AgentRuntimePort;

  personalBrainRegistry: PersonalBrainRegistry;

  globalBrain: GlobalBrainPort;

  globalKnowledgeService: GlobalKnowledgeService;

  globalKnowledgeAdminService: GlobalKnowledgeAdminService;

  knowledgeDistillationService: KnowledgeDistillationService;

  crossTenantSubmitPipeline: CrossTenantSubmitPipeline;

  knowledgeTransfer: KnowledgeTransferPort;

  knowledgeContributionService: KnowledgeContributionService;

  contributionHistoryService: ContributionHistoryService;

  secAggRoundService: SecAggRoundService;

  loraRegistry: LoRAAdapterRegistryPort;

  brainMemoryService: BrainMemoryService;

  commandBrainService?: CommandBrainService;

  suggestionService: SuggestionService;

  undoCommandUseCase: UndoCommandUseCase;

  updateInventory: UpdateInventoryUseCase;

  applyDynamicPrice: ApplyDynamicPriceUseCase;

  supplierMonitor: SupplierMonitorPort;

  adminData: AdminDataPort;

  commandLog: CommandLogPort;

  listProducts: ListProductsUseCase;

  createProduct: CreateProductUseCase;

  createOrder: CreateOrderUseCase;

  orderRepository: OrderRepository;

  updateOrderStatus: UpdateOrderStatusUseCase;

  listDecisions: ListDecisionsUseCase;

  createDecision: CreateDecisionUseCase;

  getDecision: GetDecisionUseCase;

  respondToOffer: RespondToOfferUseCase;

  startNegotiation: StartNegotiationUseCase;

  getNegotiation: GetNegotiationUseCase;

  listActiveNegotiations: ListActiveNegotiationsUseCase;

  supplierDecisionEngine: SupplierDecisionEngine;

  supplierRepository: SupplierRepository;

  supplierOverviewService: SupplierOverviewService;

  supplierChangePort: SupplierChangePort;

  emailRepository: PrismaEmailRepository;

  monitorSupplierUseCase: MonitorSupplierUseCase;

  supplierWebhook: SupplierWebhookAdapter;

  paymentService: PaymentService;

  processPayment: ProcessPaymentUseCase;

  fulfillmentService: FulfillmentService;

  persistFulfillment: PrismaFulfillmentAdapter;

  submitInsight: SubmitInsightUseCase;

  queryInsights: QueryInsightsUseCase;

  merchantCoOwnership: PrismaMerchantCoOwnershipAdapter;

  physicalLocations: PrismaPhysicalLocationAdapter;

  selfEvolving: PrismaSelfEvolvingAdapter;

  processIncomingEmailUseCase: ProcessIncomingEmailUseCase;

  managePersonalBrainMemory: ManagePersonalBrainMemoryUseCase;

  getReflectionTimeline: GetReflectionTimelineUseCase;

  manageReflectionExperiments: ManageReflectionExperimentsUseCase;

  agentSupervisor?: AgentSupervisorPort;

  peerDelegationBridge?: import('../ai/intelligence/multi-agent/peer/PeerDelegationBridge').PeerDelegationBridge;

  federatedExecutionWorker?: import('../ai/intelligence/multi-agent/peer/federated/FederatedExecutionWorker').FederatedExecutionWorker;

  agentPatternSync?: import('../ai/intelligence/global-knowledge/agent-patterns/AgentPatternSyncService').AgentPatternSyncService;

  reflectionDistillationService?: ReflectionDistillationService;

  reflectionExperimentService?: ReflectionExperimentService;

  reflectionMetricsRecorder?: ReflectionMetricsRecorder;

  memoryConsolidationJob: import('../ai/intelligence/personal-brain/memory/jobs/MemoryConsolidationJob').MemoryConsolidationJob;

  bilateralExchangeService: BilateralExchangeService;

}



let root: AppCompositionRoot | null = null;

let bootstrapped = false;



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



export function bootstrapApplication(): AppCompositionRoot {

  if (bootstrapped && root) {

    return root;

  }



  registerEventHandlers();
  setOutboxRelayService(new OutboxRelayService(createMessageBroker()));

  assertAllRequiredHandlersRegistered();



  const inventoryRepo = new PrismaInventoryRepository(prisma);

  const productRepo = new PrismaProductRepository(prisma);

  const orderRepo = new PrismaOrderRepository(prisma);

  const negotiationRepo = new PrismaNegotiationRepository(prisma);

  const paymentRepo = new PrismaPaymentRepository(prisma);

  const hiveMindRepo = new PrismaHiveMindRepository(prisma);

  const supplierRepo = new PrismaSupplierRepository(prisma);

  const adminData = new PrismaAdminDataAdapter();

  const pricingEngine = new DynamicPricingEngine(inventoryRepo);

  const supplierDecisionEngine = new SupplierDecisionEngine();

  const decisionRepo = new PrismaDecisionRepository(prisma);

  const paymentService = new PaymentService(

    paymentRepo,

    paymentGateway,

    paymentGateway,

    paymentIdempotencyAdapter,

    paymentWebhookAdapter

  );

  const fulfillmentService = new FulfillmentService();

  const commandLog = new PrismaCommandLogAdapter();

  const supplierChangePort = new PrismaSupplierChangeAdapter();

  const emailRepository = new PrismaEmailRepository(prisma);



  const submitInsight = new SubmitInsightUseCase(hiveMindRepo);

  const queryInsights = new QueryInsightsUseCase(hiveMindRepo, new AggregationService());

  const intelligence = createIntelligenceLayer({
    submitInsight,
    queryInsights,
    privacyBudgetService,
    adminData,
    dynamicPricingEngine: pricingEngine,
    decisionRepository: decisionRepo,
  });

  const bilateralExchangeService = new BilateralExchangeService(
    new BilateralImportAdapter(intelligence.personalBrainRegistry)
  );

  const monitorSupplierUseCase = new MonitorSupplierUseCase(
    supplierRepo,
    new WebScraperService(),
    new PriceChangeDetectorService(),
    supplierDecisionEngine,
    supplierChangePort,
    intelligence.personalBrainRegistry,
    intelligence.peerDelegationBridge
  );

  const supplierMonitorAdapter = new SupplierMonitorAdapter(monitorSupplierUseCase);
  intelligence.toolRegistry?.setSupplierMonitor(supplierMonitorAdapter);

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

  const processIncomingEmailUseCase = new ProcessIncomingEmailUseCase(

    emailRepository,

    new EmailClassifierService(),

    smtpMailSender,

    new EmailContextProvider(emailContextAdapter),

    undefined,

    undefined,

    intelligence.personalBrainRegistry,

    intelligence.peerDelegationBridge

  );



  root = {

    executeNaturalLanguageCommand: new ExecuteNaturalLanguageCommandUseCase(

      supplierMonitorAdapter,

      adminData,

      commandLog,

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
        reflectionExperimentService: intelligence.reflectionExperimentService,
        reflectionMetricsRecorder: intelligence.reflectionMetricsRecorder,
        reflectionDistillationService: intelligence.reflectionDistillationService,
        agentPatternSync: intelligence.agentPatternSync,
      }

    ),

    executeBrainTool,

    getAgentRun: new GetAgentRunUseCase(),

    resumeBrainAgentRun,

    agentRuntime: intelligence.agentRuntime,

    personalBrainRegistry: intelligence.personalBrainRegistry,

    globalBrain: intelligence.globalBrain,

    globalKnowledgeService: intelligence.globalKnowledgeService,

    globalKnowledgeAdminService: intelligence.globalKnowledgeAdminService,

    knowledgeDistillationService: intelligence.knowledgeDistillationService,

    crossTenantSubmitPipeline: intelligence.crossTenantSubmitPipeline,

    knowledgeTransfer: intelligence.knowledgeTransfer,

    knowledgeContributionService: intelligence.knowledgeContributionService,

    contributionHistoryService: intelligence.contributionHistoryService,

    secAggRoundService: intelligence.secAggRoundService,

    loraRegistry: intelligence.loraRegistry,

    brainMemoryService: intelligence.brainMemoryService,

    commandBrainService: intelligence.commandBrainService,

    suggestionService: new SuggestionService(),

    undoCommandUseCase: new UndoCommandUseCase({
      personalBrainRegistry: intelligence.personalBrainRegistry,
      personalBrainMemory: intelligence.personalBrainMemory,
      adminData,
    }),

    updateInventory: new UpdateInventoryUseCase(inventoryRepo),

    applyDynamicPrice: new ApplyDynamicPriceUseCase(
      pricingEngine,
      inventoryRepo,
      intelligence.peerDelegationBridge
    ),

    supplierMonitor: new SupplierMonitorAdapter(monitorSupplierUseCase),

    adminData,

    commandLog,

    listProducts: new ListProductsUseCase(productRepo),

    createProduct: new CreateProductUseCase(productRepo),

    createOrder: new CreateOrderUseCase(orderRepo),

    orderRepository: orderRepo,

    updateOrderStatus: new UpdateOrderStatusUseCase(orderRepo),

    listDecisions: new ListDecisionsUseCase(decisionRepo),

    createDecision: new CreateDecisionUseCase(
      decisionRepo,
      intelligence.peerDelegationBridge
    ),

    getDecision: new GetDecisionUseCase(decisionRepo),

    respondToOffer: new RespondToOfferUseCase(
      negotiationRepo,
      productQueryAdapter,
      negotiationEngine,
      intelligence.peerDelegationBridge
    ),

    startNegotiation: new StartNegotiationUseCase(negotiationRepo),

    getNegotiation: new GetNegotiationUseCase(negotiationRepo),

    listActiveNegotiations: new ListActiveNegotiationsUseCase(negotiationRepo),

    supplierDecisionEngine,

    supplierRepository: supplierRepo,

    supplierOverviewService: new SupplierOverviewService(prisma),

    supplierChangePort,

    emailRepository,

    monitorSupplierUseCase,

    supplierWebhook: new SupplierWebhookAdapter(),

    paymentService,

    processPayment: new ProcessPaymentUseCase(paymentService),

    fulfillmentService,

    persistFulfillment: new PrismaFulfillmentAdapter(),

    submitInsight,

    queryInsights,

    merchantCoOwnership: new PrismaMerchantCoOwnershipAdapter(),

    physicalLocations: new PrismaPhysicalLocationAdapter(),

    selfEvolving: new PrismaSelfEvolvingAdapter(),

    processIncomingEmailUseCase,

    managePersonalBrainMemory: new ManagePersonalBrainMemoryUseCase(intelligence.personalBrainMemory),

    getReflectionTimeline: new GetReflectionTimelineUseCase(intelligence.personalBrainMemory.longTerm),

    manageReflectionExperiments: new ManageReflectionExperimentsUseCase(
      intelligence.reflectionExperimentService ?? new ReflectionExperimentService()
    ),

    agentSupervisor: intelligence.agentSupervisor,

    peerDelegationBridge: intelligence.peerDelegationBridge,

    federatedExecutionWorker: intelligence.federatedExecutionWorker,

    agentPatternSync: intelligence.agentPatternSync,

    reflectionDistillationService: intelligence.reflectionDistillationService,

    reflectionExperimentService: intelligence.reflectionExperimentService,

    reflectionMetricsRecorder: intelligence.reflectionMetricsRecorder,

    memoryConsolidationJob: intelligence.memoryConsolidationJob,

    bilateralExchangeService,

  };



  bootstrapped = true;

  return root!;

}



export function getCompositionRoot(): AppCompositionRoot {

  if (!root) {

    throw new Error('Application not bootstrapped. Call bootstrapApplication() first.');

  }

  return root;

}



export async function processEventOutbox(): Promise<number> {

  return eventBus.processOutbox();

}



export function createProcessIncomingEmailUseCase(

  emailRepository: PrismaEmailRepository = new PrismaEmailRepository(prisma)

): ProcessIncomingEmailUseCase {

  if (root) {

    return root.processIncomingEmailUseCase;

  }

  return new ProcessIncomingEmailUseCase(

    emailRepository,

    new EmailClassifierService(),

    smtpMailSender,

    new EmailContextProvider(emailContextAdapter)

  );

}


