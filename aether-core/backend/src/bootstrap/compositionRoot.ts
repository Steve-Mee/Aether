import { prisma } from '../shared/prisma/client';
import { registerEventHandlers } from './eventHandlers';
import { assertAllRequiredHandlersRegistered } from '../shared/events/eventHandlerRegistry';
import { eventBus } from '../shared/events/eventBus';
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

export function createProcessIncomingEmailUseCase(
  emailRepository: PrismaEmailRepository = new PrismaEmailRepository(prisma)
): ProcessIncomingEmailUseCase {
  return new ProcessIncomingEmailUseCase(
    emailRepository,
    new EmailClassifierService(),
    smtpMailSender,
    new EmailContextProvider(emailContextAdapter)
  );
}

export interface AppCompositionRoot {
  executeNaturalLanguageCommand: ExecuteNaturalLanguageCommandUseCase;
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

  const monitorSupplierUseCase = new MonitorSupplierUseCase(
    supplierRepo,
    new WebScraperService(),
    new PriceChangeDetectorService(),
    supplierDecisionEngine,
    supplierChangePort
  );

  root = {
    executeNaturalLanguageCommand: new ExecuteNaturalLanguageCommandUseCase(
      new SupplierMonitorAdapter(monitorSupplierUseCase),
      adminData,
      commandLog
    ),
    suggestionService: new SuggestionService(),
    undoCommandUseCase: new UndoCommandUseCase(),
    updateInventory: new UpdateInventoryUseCase(inventoryRepo),
    applyDynamicPrice: new ApplyDynamicPriceUseCase(pricingEngine, inventoryRepo),
    supplierMonitor: new SupplierMonitorAdapter(monitorSupplierUseCase),
    adminData,
    commandLog,
    listProducts: new ListProductsUseCase(productRepo),
    createProduct: new CreateProductUseCase(productRepo),
    createOrder: new CreateOrderUseCase(orderRepo),
    orderRepository: orderRepo,
    updateOrderStatus: new UpdateOrderStatusUseCase(orderRepo),
    listDecisions: new ListDecisionsUseCase(decisionRepo),
    createDecision: new CreateDecisionUseCase(decisionRepo),
    getDecision: new GetDecisionUseCase(decisionRepo),
    respondToOffer: new RespondToOfferUseCase(negotiationRepo, productQueryAdapter, negotiationEngine),
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
    submitInsight: new SubmitInsightUseCase(hiveMindRepo),
    queryInsights: new QueryInsightsUseCase(hiveMindRepo, new AggregationService()),
    merchantCoOwnership: new PrismaMerchantCoOwnershipAdapter(),
    physicalLocations: new PrismaPhysicalLocationAdapter(),
    selfEvolving: new PrismaSelfEvolvingAdapter(),
    processIncomingEmailUseCase: createProcessIncomingEmailUseCase(emailRepository),
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
