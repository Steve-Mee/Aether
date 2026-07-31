import { GetAgentRunUseCase } from '../../modules/admin-command-bar/application/use-cases/GetAgentRunUseCase';
import { SuggestionService } from '../../modules/admin-command-bar/application/services/SuggestionService';
import { UndoCommandUseCase } from '../../modules/admin-command-bar/application/use-cases/UndoCommandUseCase';
import { UpdateInventoryUseCase } from '../../modules/inventory-pricing/application/use-cases/UpdateInventoryUseCase';
import { ListInventoryUseCase } from '../../modules/inventory-pricing/application/use-cases/ListInventoryUseCase';
import { AdjustInventoryUseCase } from '../../modules/inventory-pricing/application/use-cases/AdjustInventoryUseCase';
import { ApplyDynamicPriceUseCase } from '../../modules/inventory-pricing/application/use-cases/ApplyDynamicPriceUseCase';
import { ListProductsUseCase } from '../../modules/product-catalog/application/use-cases/ListProductsUseCase';
import { CreateProductUseCase } from '../../modules/product-catalog/application/use-cases/CreateProductUseCase';
import { GetProductUseCase } from '../../modules/product-catalog/application/use-cases/GetProductUseCase';
import { UpdateProductUseCase } from '../../modules/product-catalog/application/use-cases/UpdateProductUseCase';
import { DeleteProductUseCase } from '../../modules/product-catalog/application/use-cases/DeleteProductUseCase';
import { ListProductVariantsUseCase } from '../../modules/product-catalog/application/use-cases/ListProductVariantsUseCase';
import { CreateProductVariantUseCase } from '../../modules/product-catalog/application/use-cases/CreateProductVariantUseCase';
import { UpdateProductVariantUseCase } from '../../modules/product-catalog/application/use-cases/UpdateProductVariantUseCase';
import { DeleteProductVariantUseCase } from '../../modules/product-catalog/application/use-cases/DeleteProductVariantUseCase';
import { UploadProductMediaUseCase } from '../../modules/product-catalog/application/use-cases/UploadProductMediaUseCase';
import { UpdateOrderStatusUseCase } from '../../modules/order-management/application/use-cases/UpdateOrderStatusUseCase';
import { GetOrderDetailUseCase } from '../../modules/order-management/application/use-cases/GetOrderDetailUseCase';
import { ShipOrderUseCase } from '../../modules/order-management/application/use-cases/ShipOrderUseCase';
import { CreateOrderRefundUseCase } from '../../modules/order-management/application/use-cases/CreateOrderRefundUseCase';
import { ListCustomersUseCase } from '../../modules/customers/application/use-cases/ListCustomersUseCase';
import { GetCustomerUseCase } from '../../modules/customers/application/use-cases/GetCustomerUseCase';
import { ListCustomerOrdersUseCase } from '../../modules/customers/application/use-cases/ListCustomerOrdersUseCase';
import {
  ListDecisionsUseCase,
  CreateDecisionUseCase,
  GetDecisionUseCase,
} from '../../modules/autonomous-operations/application/use-cases/DecisionUseCases';
import { SupplierOverviewService } from '../../modules/supplier-intelligence/application/services/SupplierOverviewService';
import { PrismaSupplierOverviewAdapter } from '../../modules/supplier-intelligence/infrastructure/adapters/PrismaSupplierOverviewAdapter';
import { SupplierWebhookAdapter } from '../../modules/supplier-intelligence/infrastructure/adapters/SupplierWebhookAdapter';
import { ProcessPaymentUseCase } from '../../modules/payment-fulfillment/application/use-cases/ProcessPaymentUseCase';
import { PrismaFulfillmentAdapter } from '../../modules/payment-fulfillment/infrastructure/adapters/PrismaFulfillmentAdapter';
import { PrismaMerchantCoOwnershipAdapter } from '../../modules/merchant-co-ownership/infrastructure/adapters/PrismaMerchantCoOwnershipAdapter';
import { PrismaPhysicalLocationAdapter } from '../../modules/physical-digital-symbiosis/infrastructure/adapters/PrismaPhysicalLocationAdapter';
import { PrismaSelfEvolvingAdapter } from '../../modules/self-evolving-codebase/infrastructure/adapters/PrismaSelfEvolvingAdapter';
import { ManagePersonalBrainMemoryUseCase } from '../../modules/admin-command-bar/application/use-cases/ManagePersonalBrainMemoryUseCase';
import { GetReflectionTimelineUseCase } from '../../modules/admin-command-bar/application/use-cases/GetReflectionTimelineUseCase';
import { ManageReflectionExperimentsUseCase } from '../../modules/admin-command-bar/application/use-cases/ManageReflectionExperimentsUseCase';
import { ReflectionExperimentService } from '../../ai/intelligence/personal-brain/reflection/experiments/ReflectionExperimentService';

import type { AppCompositionRoot } from '../appCompositionRootTypes';
import { type BootstrapContext, prisma } from './bootstrapContext';
import type { IntelligenceWiring } from './wireIntelligence';
import type { AdminWiring } from './wireAdmin';
import type { MailWiring } from './wireMail';
import type { CommerceWiring } from './wireCommerce';
import type { StorefrontWiring } from './wireStorefront';

export function assembleCompositionRoot(
  ctx: BootstrapContext,
  intel: IntelligenceWiring,
  admin: AdminWiring,
  mail: MailWiring,
  commerce: CommerceWiring,
  storefront: StorefrontWiring
): AppCompositionRoot {
  const { intelligence, executeBrainTool, resumeBrainAgentRun, bilateralExchangeService } = intel;

  return {
    executeNaturalLanguageCommand: admin.executeNaturalLanguageCommand,
    executeBrainTool,
    getAgentRun: new GetAgentRunUseCase(),
    resumeBrainAgentRun,
    agentRuntime: intelligence.agentRuntime,
    personalBrainRegistry: intelligence.personalBrainRegistry,
    globalBrain: intelligence.globalBrain,
    globalBrainMode: intelligence.globalBrainMode,
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
    suggestionService: new SuggestionService(admin.proactiveSuggestionService, admin.suggestionDataRepository),
    uiAdoptionMetricsService: admin.uiAdoptionMetricsService,
    handoffOverviewService: admin.handoffOverviewService,
    proactiveSuggestionService: admin.proactiveSuggestionService,
    proactiveLearningService: admin.proactiveLearningService,
    proactiveEnrichmentService: admin.proactiveEnrichmentService,
    proactiveAutoExecuteService: admin.proactiveAutoExecuteService,
    undoCommandUseCase: new UndoCommandUseCase({
      commandLog: ctx.commandLog,
      personalBrainRegistry: intelligence.personalBrainRegistry,
      personalBrainMemory: intelligence.personalBrainMemory,
      adminData: ctx.adminData,
    }),
    updateInventory: new UpdateInventoryUseCase(ctx.inventoryRepo),
    listInventory: new ListInventoryUseCase(ctx.inventoryRepo),
    adjustInventory: new AdjustInventoryUseCase(new UpdateInventoryUseCase(ctx.inventoryRepo)),
    applyDynamicPrice: new ApplyDynamicPriceUseCase(
      ctx.pricingEngine,
      ctx.inventoryRepo,
      intelligence.peerDelegationBridge
    ),
    supplierMonitor: admin.supplierMonitorAdapter,
    adminData: ctx.adminData,
    commandLog: ctx.commandLog,
    listProducts: new ListProductsUseCase(ctx.productRepo),
    createProduct: new CreateProductUseCase(ctx.productRepo),
    getProduct: new GetProductUseCase(ctx.productRepo),
    updateProduct: new UpdateProductUseCase(ctx.productRepo),
    deleteProduct: new DeleteProductUseCase(ctx.productRepo),
    listProductVariants: new ListProductVariantsUseCase(ctx.productRepo),
    createProductVariant: new CreateProductVariantUseCase(ctx.productRepo),
    updateProductVariant: new UpdateProductVariantUseCase(ctx.productRepo),
    deleteProductVariant: new DeleteProductVariantUseCase(ctx.productRepo),
    uploadProductMedia: new UploadProductMediaUseCase(ctx.productRepo, ctx.productMediaStore),
    siteRepository: ctx.siteRepository,
    storefrontArtifactStore: ctx.storefrontArtifactStore,
    storefrontCodegenCompiler: ctx.storefrontCodegenCompiler,
    storefrontPreviewHost: ctx.storefrontPreviewHost,
    storefrontDeploy: ctx.storefrontDeploy,
    storefrontCatalog: ctx.storefrontCatalog,
    createSiteProject: storefront.createSiteProject,
    getSiteProject: storefront.getSiteProject,
    listSiteProjects: storefront.listSiteProjects,
    createSiteRevision: storefront.createSiteRevision,
    listSiteRevisions: storefront.listSiteRevisions,
    getSiteRevision: storefront.getSiteRevision,
    listSitePages: storefront.listSitePages,
    getSitePage: storefront.getSitePage,
    updateSitePageCopy: storefront.updateSitePageCopy,
    startSiteBuild: storefront.startSiteBuild,
    healBrokenLiveSites: storefront.healBrokenLiveSites,
    applyBuildWallTrigger: storefront.applyBuildWallTrigger,
    getSiteBuildJob: storefront.getSiteBuildJob,
    proposeSitePublish: storefront.proposeSitePublish,
    getSiteDeployTarget: storefront.getSiteDeployTarget,
    upsertSiteDeployTarget: storefront.upsertSiteDeployTarget,
    getSitePreviewUrl: storefront.getSitePreviewUrl,
    resolveStorefrontSite: storefront.resolveStorefrontSite,
    getStorefrontCatalog: storefront.getStorefrontCatalog,
    getStorefrontProduct: storefront.getStorefrontProduct,
    getStorefrontPage: storefront.getStorefrontPage,
    cartRepository: ctx.cartRepository,
    storefrontCheckoutIdempotency: ctx.storefrontCheckoutIdempotency,
    createStorefrontCart: storefront.createStorefrontCart,
    getStorefrontCart: storefront.getStorefrontCart,
    addStorefrontCartItem: storefront.addStorefrontCartItem,
    updateStorefrontCartItem: storefront.updateStorefrontCartItem,
    removeStorefrontCartItem: storefront.removeStorefrontCartItem,
    checkoutStorefrontCart: storefront.checkoutStorefrontCart,
    createOrder: ctx.createOrderUseCase,
    orderRepository: ctx.orderRepo,
    updateOrderStatus: new UpdateOrderStatusUseCase(ctx.orderRepo),
    getOrderDetail: new GetOrderDetailUseCase(ctx.orderRepo),
    shipOrder: new ShipOrderUseCase(ctx.orderRepo),
    createOrderRefund: new CreateOrderRefundUseCase(ctx.orderRepo, ctx.paymentRepo),
    listCustomers: new ListCustomersUseCase(ctx.adminData),
    getCustomer: new GetCustomerUseCase(ctx.adminData),
    listCustomerOrders: new ListCustomerOrdersUseCase(ctx.orderRepo),
    listPromotions: ctx.listPromotions,
    createPromotion: ctx.createPromotion,
    listDecisions: new ListDecisionsUseCase(ctx.decisionRepo),
    createDecision: new CreateDecisionUseCase(ctx.decisionRepo, intelligence.peerDelegationBridge),
    getDecision: new GetDecisionUseCase(ctx.decisionRepo),
    respondToOffer: commerce.respondToOfferUseCase,
    negotiationSessionOrchestrator: commerce.negotiationSessionOrchestrator,
    startNegotiation: commerce.startNegotiation,
    getNegotiation: commerce.getNegotiation,
    listActiveNegotiations: commerce.listActiveNegotiations,
    supplierDecisionEngine: ctx.supplierDecisionEngine,
    supplierRepository: ctx.supplierRepo,
    supplierOverviewService: new SupplierOverviewService(new PrismaSupplierOverviewAdapter(prisma)),
    supplierChangePort: ctx.supplierChangePort,
    emailRepository: ctx.emailRepository,
    monitorSupplierUseCase: admin.monitorSupplierUseCase,
    monitorLowStockUseCase: admin.monitorLowStockUseCase,
    supplierWebhook: new SupplierWebhookAdapter(),
    paymentService: ctx.paymentService,
    paymentRepository: ctx.paymentRepo,
    processPayment: new ProcessPaymentUseCase(ctx.paymentService),
    fulfillmentService: ctx.fulfillmentService,
    persistFulfillment: new PrismaFulfillmentAdapter(),
    submitInsight: ctx.submitInsight,
    queryInsights: ctx.queryInsights,
    merchantCoOwnership: new PrismaMerchantCoOwnershipAdapter(),
    physicalLocations: new PrismaPhysicalLocationAdapter(),
    selfEvolving: new PrismaSelfEvolvingAdapter(),
    processIncomingEmailUseCase: mail.processIncomingEmailUseCase,
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
    runMemoryGcJob: intelligence.runMemoryGcJob,
    runWorkingMemory: intelligence.runWorkingMemory,
    bilateralExchangeService,
    goalService: admin.goalService,
    goalProgressService: admin.goalProgressService,
    goalContextProvider: admin.goalContextProvider,
    goalRepository: admin.goalRepository,
    goalSuggestionEngine: admin.goalSuggestionEngine,
    agentRegistry: intelligence.agentRegistry,
    agentRosterService: admin.agentRosterService,
    activityFeedService: admin.activityFeedService,
    overviewFeedService: admin.overviewFeedService,
    overviewFeedWriter: admin.overviewFeedWriter,
    overviewNotificationDispatcher: admin.overviewNotificationDispatcher,
    notificationWriter: admin.notificationWriter,
    notificationInboxService: admin.notificationInboxService,
    notificationReadStateService: admin.notificationReadStateService,
    notificationBackfillJob: admin.notificationBackfillJob,
    notificationDigestJob: admin.notificationDigestJob,
    overviewDigestJob: admin.overviewDigestJob,
    overviewFeedBackfillJob: admin.overviewFeedBackfillJob,
  };
}
