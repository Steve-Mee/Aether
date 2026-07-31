import { prisma } from '../../shared/prisma/client';

import { PrismaInventoryRepository } from '../../modules/inventory-pricing/infrastructure/persistence/PrismaInventoryRepository';
import { PrismaProductRepository } from '../../modules/product-catalog/infrastructure/persistence/PrismaProductRepository';
import { LocalDiskMediaStore } from '../../modules/product-catalog/infrastructure/media/LocalDiskMediaStore';
import { PrismaSiteRepository } from '../../modules/storefront-builder/infrastructure/persistence/PrismaSiteRepository';
import {
  LocalFsArtifactStoreAdapter,
  resolveStorefrontArtifactsDir,
} from '../../modules/storefront-builder/infrastructure/artifacts/LocalFsArtifactStoreAdapter';
import { AllowlistCodegenCompiler } from '../../modules/storefront-builder/infrastructure/codegen/AllowlistCodegenCompiler';
import { LocalPreviewHostAdapter } from '../../modules/storefront-builder/infrastructure/preview/LocalPreviewHostAdapter';
import { createStorefrontDeployAdapter } from '../../modules/storefront-builder/infrastructure/deploy/createStorefrontDeployAdapter';
import { PrismaStorefrontCatalogAdapter } from '../../modules/storefront-builder/infrastructure/catalog/PrismaStorefrontCatalogAdapter';
import { PrismaPublishApprovalAdapter } from '../../modules/storefront-builder/infrastructure/approval/PrismaPublishApprovalAdapter';
import { PrismaCartRepository } from '../../modules/storefront-builder/infrastructure/persistence/PrismaCartRepository';
import { PrismaCheckoutIdempotencyAdapter } from '../../modules/storefront-builder/infrastructure/idempotency/PrismaCheckoutIdempotencyAdapter';
import { PrismaOrderRepository } from '../../modules/order-management/infrastructure/persistence/PrismaOrderRepository';
import { CreateOrderUseCase } from '../../modules/order-management/application/use-cases/CreateOrderUseCase';
import { PrismaNegotiationRepository } from '../../modules/agentic-commerce/infrastructure/persistence/PrismaNegotiationRepository';
import { PrismaPaymentRepository } from '../../modules/payment-fulfillment/infrastructure/persistence/PrismaPaymentRepository';
import { PrismaPromotionRepository } from '../../modules/promotions/infrastructure/persistence/PrismaPromotionRepository';
import { CreatePromotionUseCase } from '../../modules/promotions/application/use-cases/CreatePromotionUseCase';
import { ListPromotionsUseCase } from '../../modules/promotions/application/use-cases/ListPromotionsUseCase';
import { PrismaHiveMindRepository } from '../../modules/zero-knowledge-hive-mind/infrastructure/persistence/PrismaHiveMindRepository';
import { PrismaSupplierRepository } from '../../modules/supplier-intelligence/infrastructure/persistence/PrismaSupplierRepository';
import { PrismaAdminDataAdapter } from '../../modules/admin-command-bar/infrastructure/adapters/PrismaAdminDataAdapter';
import { DynamicPricingEngine } from '../../modules/inventory-pricing/application/services/DynamicPricingEngine';
import { SupplierDecisionEngine } from '../../modules/supplier-intelligence/application/services/SupplierDecisionEngine';
import { PrismaDecisionRepository } from '../../modules/autonomous-operations/infrastructure/persistence/PrismaDecisionRepository';
import { PaymentService } from '../../modules/payment-fulfillment/application/services/PaymentService';
import { FulfillmentService } from '../../modules/payment-fulfillment/application/services/FulfillmentService';
import { PrismaCommandLogAdapter } from '../../modules/admin-command-bar/infrastructure/adapters/PrismaCommandLogAdapter';
import { PrismaSupplierChangeAdapter } from '../../modules/supplier-intelligence/infrastructure/adapters/PrismaSupplierChangeAdapter';
import { PrismaEmailRepository } from '../../modules/aether-mail/infrastructure/persistence/PrismaEmailRepository';
import { SubmitInsightUseCase } from '../../modules/zero-knowledge-hive-mind/application/use-cases/SubmitInsightUseCase';
import { QueryInsightsUseCase } from '../../modules/zero-knowledge-hive-mind/application/use-cases/QueryInsightsUseCase';
import { AggregationService } from '../../modules/zero-knowledge-hive-mind/application/services/AggregationService';
import { privacyBudgetService } from '../../modules/zero-knowledge-hive-mind/wiring';
import { paymentGateway } from '../../modules/payment-fulfillment/infrastructure/adapters/PaymentGatewayAdapter';
import { paymentIdempotencyAdapter } from '../../modules/payment-fulfillment/infrastructure/adapters/PrismaPaymentIdempotencyAdapter';
import { paymentWebhookAdapter } from '../../modules/payment-fulfillment/infrastructure/adapters/PrismaPaymentWebhookAdapter';

import type { SiteRepository } from '../../modules/storefront-builder/domain/repositories/SiteRepository';
import type { CartRepository } from '../../modules/storefront-builder/domain/repositories/CartRepository';
import type { ArtifactStorePort } from '../../modules/storefront-builder/application/ports/ArtifactStorePort';
import type { CodegenCompilerPort } from '../../modules/storefront-builder/application/ports/CodegenCompilerPort';
import type { PreviewHostPort } from '../../modules/storefront-builder/application/ports/PreviewHostPort';
import type { DeployPort } from '../../modules/storefront-builder/application/ports/DeployPort';
import type { StorefrontCatalogPort } from '../../modules/storefront-builder/application/ports/StorefrontCatalogPort';
import type { CheckoutIdempotencyPort } from '../../modules/storefront-builder/application/ports/CheckoutIdempotencyPort';
import type { PaymentRepository } from '../../modules/payment-fulfillment/domain/repositories/PaymentRepository';
import type { OrderRepository } from '../../modules/order-management/domain/repositories/OrderRepository';
import type { SupplierRepository } from '../../modules/supplier-intelligence/domain/repositories/SupplierRepository';
import type { AdminDataPort } from '../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { CommandLogPort } from '../../modules/admin-command-bar/application/ports/CommandLogPort';
import type { SupplierChangePort } from '../../modules/supplier-intelligence/application/ports/SupplierChangePort';

/** Mutable shared state assembled during bootstrapApplication(). */
export interface BootstrapContext {
  inventoryRepo: PrismaInventoryRepository;
  productRepo: PrismaProductRepository;
  productMediaStore: LocalDiskMediaStore;
  siteRepository: SiteRepository;
  storefrontArtifactStore: ArtifactStorePort;
  storefrontCodegenCompiler: CodegenCompilerPort;
  storefrontPreviewHost: PreviewHostPort;
  storefrontDeploy: DeployPort;
  storefrontCatalog: StorefrontCatalogPort;
  storefrontPublishApproval: PrismaPublishApprovalAdapter;
  cartRepository: CartRepository;
  storefrontCheckoutIdempotency: CheckoutIdempotencyPort;
  orderRepo: OrderRepository;
  createOrderUseCase: CreateOrderUseCase;
  negotiationRepo: PrismaNegotiationRepository;
  paymentRepo: PaymentRepository;
  promotionRepo: PrismaPromotionRepository;
  createPromotion: CreatePromotionUseCase;
  listPromotions: ListPromotionsUseCase;
  hiveMindRepo: PrismaHiveMindRepository;
  supplierRepo: SupplierRepository;
  adminData: AdminDataPort;
  pricingEngine: DynamicPricingEngine;
  supplierDecisionEngine: SupplierDecisionEngine;
  decisionRepo: PrismaDecisionRepository;
  paymentService: PaymentService;
  fulfillmentService: FulfillmentService;
  commandLog: CommandLogPort;
  supplierChangePort: SupplierChangePort;
  emailRepository: PrismaEmailRepository;
  submitInsight: SubmitInsightUseCase;
  queryInsights: QueryInsightsUseCase;
}

export function createBootstrapContext(): BootstrapContext {
  const inventoryRepo = new PrismaInventoryRepository(prisma);
  const productRepo = new PrismaProductRepository(prisma);
  const productMediaStore = new LocalDiskMediaStore();

  const siteRepository = new PrismaSiteRepository(prisma);
  const storefrontArtifactStore = new LocalFsArtifactStoreAdapter(resolveStorefrontArtifactsDir());
  const storefrontCodegenCompiler = new AllowlistCodegenCompiler(storefrontArtifactStore);
  const storefrontPreviewHost = new LocalPreviewHostAdapter();
  const storefrontDeploy = createStorefrontDeployAdapter(siteRepository, storefrontArtifactStore);
  const storefrontCatalog = new PrismaStorefrontCatalogAdapter(prisma);
  const storefrontPublishApproval = new PrismaPublishApprovalAdapter();
  const cartRepository = new PrismaCartRepository(prisma);
  const storefrontCheckoutIdempotency = new PrismaCheckoutIdempotencyAdapter(prisma);

  const orderRepo = new PrismaOrderRepository(prisma);
  const createOrderUseCase = new CreateOrderUseCase(orderRepo);

  const negotiationRepo = new PrismaNegotiationRepository(prisma);
  const paymentRepo = new PrismaPaymentRepository(prisma);

  const promotionRepo = new PrismaPromotionRepository(prisma);
  const createPromotion = new CreatePromotionUseCase(promotionRepo);
  const listPromotions = new ListPromotionsUseCase(promotionRepo);

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

  return {
    inventoryRepo,
    productRepo,
    productMediaStore,
    siteRepository,
    storefrontArtifactStore,
    storefrontCodegenCompiler,
    storefrontPreviewHost,
    storefrontDeploy,
    storefrontCatalog,
    storefrontPublishApproval,
    cartRepository,
    storefrontCheckoutIdempotency,
    orderRepo,
    createOrderUseCase,
    negotiationRepo,
    paymentRepo,
    promotionRepo,
    createPromotion,
    listPromotions,
    hiveMindRepo,
    supplierRepo,
    adminData,
    pricingEngine,
    supplierDecisionEngine,
    decisionRepo,
    paymentService,
    fulfillmentService,
    commandLog,
    supplierChangePort,
    emailRepository,
    submitInsight,
    queryInsights,
  };
}

export { prisma, privacyBudgetService };
