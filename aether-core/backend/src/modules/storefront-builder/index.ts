/** Public surface for storefront-builder bounded context. */

export { SiteProject } from './domain/entities/SiteProject';
export type { SiteProjectStatus } from './domain/entities/SiteProject';
export { SiteRevision } from './domain/entities/SiteRevision';
export { SitePage } from './domain/entities/SitePage';
export { BuildJob } from './domain/entities/BuildJob';
export type { BuildJobStatus } from './domain/entities/BuildJob';
export { DeployTarget } from './domain/entities/DeployTarget';

export type {
  SiteRepository,
  CreateSiteProjectInput,
  CreateSiteProjectResult,
  CreateRevisionInput,
  CreateRevisionResult,
  AttachCompiledArtifactsInput,
  UpdateBuildJobInput,
  UpsertDeployTargetInput,
} from './domain/repositories/SiteRepository';

export type { ArtifactStorePort } from './application/ports/ArtifactStorePort';
export type {
  CodegenCompilerPort,
  CodegenCompileInput,
  CodegenCompileResult,
  CodegenPageArtifact,
} from './application/ports/CodegenCompilerPort';
export type {
  PreviewHostPort,
  StartPreviewInput,
  StartPreviewResult,
} from './application/ports/PreviewHostPort';
export type { DeployPort, DeployInput, DeployResult } from './application/ports/DeployPort';
export type {
  StorefrontCatalogPort,
  StorefrontCatalogProduct,
  StorefrontCatalogVariant,
  StorefrontCatalogListOptions,
  StorefrontCatalogListResult,
} from './application/ports/StorefrontCatalogPort';
export type {
  PublishApprovalPort,
  ProposePublishApprovalInput,
  ProposePublishApprovalResult,
} from './application/ports/PublishApprovalPort';

export {
  CreateSiteProjectUseCase,
  DuplicateSiteSlugError,
} from './application/use-cases/CreateSiteProjectUseCase';
export { GetSiteProjectUseCase } from './application/use-cases/GetSiteProjectUseCase';
export { ListSiteProjectsUseCase } from './application/use-cases/ListSiteProjectsUseCase';
export {
  CreateRevisionUseCase,
  ProjectNotFoundError,
} from './application/use-cases/CreateRevisionUseCase';
export { ListRevisionsUseCase } from './application/use-cases/ListRevisionsUseCase';
export { GetRevisionUseCase } from './application/use-cases/GetRevisionUseCase';
export {
  ListPagesUseCase,
  RevisionNotFoundError,
} from './application/use-cases/ListPagesUseCase';
export { GetPageUseCase } from './application/use-cases/GetPageUseCase';
export {
  StartBuildUseCase,
  BuildQaFailedError,
} from './application/use-cases/StartBuildUseCase';
export { HealBrokenLiveSitesUseCase } from './application/use-cases/HealBrokenLiveSitesUseCase';
export type { HealBrokenLiveResult, HealAction } from './application/use-cases/HealBrokenLiveSitesUseCase';
export {
  ApplyBuildWallTriggerUseCase,
  STOREFRONT_WALL_HEAL_AGENT,
} from './application/use-cases/ApplyBuildWallTriggerUseCase';
export type {
  ApplyBuildWallResult,
  StorefrontWallSuggestPort,
} from './application/use-cases/ApplyBuildWallTriggerUseCase';
export {
  isStorefrontOrganismEnabled,
  resolveBuildWallFailureThreshold,
  resolveOrganismIntervalMs,
} from './application/services/storefrontOrganismConfig';
export { storefrontOrganismJob } from './infrastructure/jobs/StorefrontOrganismJob';
export {
  runStructuralBuildChecks,
  toStructuralQaReportJson,
  pagesFromPlanJson,
} from './application/services/structuralBuildQa';
export type {
  StructuralBuildCheck,
  StructuralBuildQaResult,
  StructuralBuildQaInput,
} from './application/services/structuralBuildQa';
export { GetBuildJobUseCase } from './application/use-cases/GetBuildJobUseCase';
export {
  ProposePublishUseCase,
  QaBelowThresholdError,
  QA_PUBLISH_THRESHOLD,
} from './application/use-cases/ProposePublishUseCase';
export { GetDeployTargetUseCase } from './application/use-cases/GetDeployTargetUseCase';
export { UpsertDeployTargetUseCase } from './application/use-cases/UpsertDeployTargetUseCase';
export { GetPreviewUrlUseCase } from './application/use-cases/GetPreviewUrlUseCase';
export { ResolveStorefrontSiteUseCase } from './application/use-cases/ResolveStorefrontSiteUseCase';
export type { StorefrontSiteDto } from './application/use-cases/ResolveStorefrontSiteUseCase';
export { GetStorefrontCatalogUseCase } from './application/use-cases/GetStorefrontCatalogUseCase';
export { GetStorefrontProductUseCase, ProductNotFoundError } from './application/use-cases/GetStorefrontProductUseCase';
export { GetStorefrontPageUseCase, PageNotFoundError } from './application/use-cases/GetStorefrontPageUseCase';
export { CreateCartUseCase } from './application/use-cases/CreateCartUseCase';
export { GetCartUseCase } from './application/use-cases/GetCartUseCase';
export { AddCartItemUseCase } from './application/use-cases/AddCartItemUseCase';
export { UpdateCartItemUseCase } from './application/use-cases/UpdateCartItemUseCase';
export { RemoveCartItemUseCase } from './application/use-cases/RemoveCartItemUseCase';
export { CheckoutCartUseCase } from './application/use-cases/CheckoutCartUseCase';
export type { CheckoutCartResult, CheckoutCustomerInput } from './application/use-cases/CheckoutCartUseCase';
export {
  CartNotFoundError,
  CartEmptyError,
  StockInsufficientError,
  CartProductNotFoundError,
  CheckoutIdempotencyRequiredError,
  PaymentFailedError,
  CartNotOpenError,
  CartValidationError,
} from './application/use-cases/cartErrors';
export {
  SiteNotFoundError,
  SiteNotLiveError,
} from './application/services/resolvePublicStorefront';

export { Cart, CartItem } from './domain/entities/Cart';
export type { CartStatus } from './domain/entities/Cart';
export type { CartRepository } from './domain/repositories/CartRepository';
export type { CheckoutIdempotencyPort } from './application/ports/CheckoutIdempotencyPort';

export { PrismaSiteRepository } from './infrastructure/persistence/PrismaSiteRepository';
export { PrismaCartRepository } from './infrastructure/persistence/PrismaCartRepository';
export { PrismaCheckoutIdempotencyAdapter } from './infrastructure/idempotency/PrismaCheckoutIdempotencyAdapter';
export {
  LocalFsArtifactStoreAdapter,
  resolveStorefrontArtifactsDir,
} from './infrastructure/artifacts/LocalFsArtifactStoreAdapter';
export { AllowlistCodegenCompiler } from './infrastructure/codegen/AllowlistCodegenCompiler';
export { AllowlistCodegenCompilerStub } from './infrastructure/codegen/AllowlistCodegenCompilerStub';
export {
  APPENDIX_H_PLAN,
  APPENDIX_H_TOKENS,
  APPENDIX_H_HOME_TREE,
  APPENDIX_H_PRODUCTS_TREE,
  APPENDIX_H_PDP_TREE,
  APPENDIX_H_ABOUT_TREE,
  APPENDIX_H_CONTACT_TREE,
  APPENDIX_H_LEGAL_TREE,
  APPENDIX_H_COPY_NL,
  APPENDIX_H_TREES_BY_TEMPLATE,
  expandToCompilableSitePlan,
} from './infrastructure/codegen/appendixHFixtures';
export { CodegenRejectedError } from './infrastructure/codegen/CodegenRejectedError';
export { ALLOWLISTED_BLOCK_TYPES } from './infrastructure/codegen/allowlistedBlocks';
export type { AllowlistedBlockType } from './infrastructure/codegen/allowlistedBlocks';
export {
  sitePlanSchema,
  parseSitePlanOrThrow,
  parsePageTreeOrThrow,
} from './infrastructure/codegen/sitePlanSchema';
export type { SitePlan, PageTreeNode, DesignTokens } from './infrastructure/codegen/sitePlanSchema';
export { tokensToCss, normalizeTokensJson } from './infrastructure/codegen/tokensCss';
export {
  LocalPreviewHostAdapter,
  resolveStorefrontPreviewPort,
  buildPreviewUrl,
  DEFAULT_STOREFRONT_PREVIEW_PORT,
} from './infrastructure/preview/LocalPreviewHostAdapter';
export {
  StubDeployAdapter,
  isStorefrontDeployEnabled,
} from './infrastructure/deploy/StubDeployAdapter';
export { LocalDeployAdapter } from './infrastructure/deploy/LocalDeployAdapter';
export { LocalEdgeDeployAdapter } from './infrastructure/deploy/LocalEdgeDeployAdapter';
export { CloudflareDeployAdapter } from './infrastructure/deploy/CloudflareDeployAdapter';
export { createStorefrontDeployAdapter } from './infrastructure/deploy/createStorefrontDeployAdapter';
export {
  resolveStorefrontDeployProvider,
  resolveStorefrontEdgeRoot,
  resolveStorefrontEdgePublicBase,
} from './infrastructure/deploy/deployProvider';
export {
  UpdatePageCopyUseCase,
  PageNotFoundForCopyError,
} from './application/use-cases/UpdatePageCopyUseCase';
export type { LiveRevisionPointer } from './infrastructure/artifacts/LocalFsArtifactStoreAdapter';
export { StubStorefrontCatalogAdapter } from './infrastructure/catalog/StubStorefrontCatalogAdapter';
export { PrismaStorefrontCatalogAdapter } from './infrastructure/catalog/PrismaStorefrontCatalogAdapter';
export { StubPublishApprovalAdapter } from './infrastructure/approval/StubPublishApprovalAdapter';
export { PrismaPublishApprovalAdapter } from './infrastructure/approval/PrismaPublishApprovalAdapter';
export {
  signPreviewToken,
  verifyPreviewToken,
  extractPreviewTokenFromAuthHeader,
  PreviewTokenError,
  PREVIEW_TOKEN_TTL_MS,
} from './application/services/previewToken';
export type { PreviewTokenClaims } from './application/services/previewToken';

export { default as websiteRouter } from './api/websiteRouter';
export { default as storefrontRouter } from './api/storefrontRouter';
export { RevisionNotReadyError } from './api/websiteErrors';
export {
  storefrontRateLimitMiddleware,
  STOREFRONT_PUBLIC_RATE_LIMIT_MAX_DEFAULT,
  STOREFRONT_PUBLIC_RATE_LIMIT_WINDOW_MS,
} from './api/storefrontRateLimit';
