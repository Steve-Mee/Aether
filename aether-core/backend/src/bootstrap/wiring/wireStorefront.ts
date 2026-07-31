import { StartBuildUseCase } from '../../modules/storefront-builder/application/use-cases/StartBuildUseCase';
import { CreateRevisionUseCase } from '../../modules/storefront-builder/application/use-cases/CreateRevisionUseCase';
import { HealBrokenLiveSitesUseCase } from '../../modules/storefront-builder/application/use-cases/HealBrokenLiveSitesUseCase';
import { ApplyBuildWallTriggerUseCase } from '../../modules/storefront-builder/application/use-cases/ApplyBuildWallTriggerUseCase';
import { CreateSiteProjectUseCase } from '../../modules/storefront-builder/application/use-cases/CreateSiteProjectUseCase';
import { GetSiteProjectUseCase } from '../../modules/storefront-builder/application/use-cases/GetSiteProjectUseCase';
import { ListSiteProjectsUseCase } from '../../modules/storefront-builder/application/use-cases/ListSiteProjectsUseCase';
import { ListRevisionsUseCase } from '../../modules/storefront-builder/application/use-cases/ListRevisionsUseCase';
import { GetRevisionUseCase } from '../../modules/storefront-builder/application/use-cases/GetRevisionUseCase';
import { ListPagesUseCase } from '../../modules/storefront-builder/application/use-cases/ListPagesUseCase';
import { GetPageUseCase } from '../../modules/storefront-builder/application/use-cases/GetPageUseCase';
import { UpdatePageCopyUseCase } from '../../modules/storefront-builder/application/use-cases/UpdatePageCopyUseCase';
import { GetBuildJobUseCase } from '../../modules/storefront-builder/application/use-cases/GetBuildJobUseCase';
import { ProposePublishUseCase } from '../../modules/storefront-builder/application/use-cases/ProposePublishUseCase';
import { GetDeployTargetUseCase } from '../../modules/storefront-builder/application/use-cases/GetDeployTargetUseCase';
import { UpsertDeployTargetUseCase } from '../../modules/storefront-builder/application/use-cases/UpsertDeployTargetUseCase';
import { GetPreviewUrlUseCase } from '../../modules/storefront-builder/application/use-cases/GetPreviewUrlUseCase';
import { ResolveStorefrontSiteUseCase } from '../../modules/storefront-builder/application/use-cases/ResolveStorefrontSiteUseCase';
import { GetStorefrontCatalogUseCase } from '../../modules/storefront-builder/application/use-cases/GetStorefrontCatalogUseCase';
import { GetStorefrontProductUseCase } from '../../modules/storefront-builder/application/use-cases/GetStorefrontProductUseCase';
import { GetStorefrontPageUseCase } from '../../modules/storefront-builder/application/use-cases/GetStorefrontPageUseCase';
import { CreateCartUseCase } from '../../modules/storefront-builder/application/use-cases/CreateCartUseCase';
import { GetCartUseCase } from '../../modules/storefront-builder/application/use-cases/GetCartUseCase';
import { AddCartItemUseCase } from '../../modules/storefront-builder/application/use-cases/AddCartItemUseCase';
import { UpdateCartItemUseCase } from '../../modules/storefront-builder/application/use-cases/UpdateCartItemUseCase';
import { RemoveCartItemUseCase } from '../../modules/storefront-builder/application/use-cases/RemoveCartItemUseCase';
import { CheckoutCartUseCase } from '../../modules/storefront-builder/application/use-cases/CheckoutCartUseCase';

import { PrismaStorefrontCustomerAdapter } from '../../modules/storefront-builder/infrastructure/persistence/PrismaStorefrontCustomerAdapter';
import { type BootstrapContext, prisma } from './bootstrapContext';
import type { AdminWiring } from './wireAdmin';

export interface StorefrontWiring {
  startSiteBuild: StartBuildUseCase;
  createSiteRevision: CreateRevisionUseCase;
  healBrokenLiveSites: HealBrokenLiveSitesUseCase;
  applyBuildWallTrigger: ApplyBuildWallTriggerUseCase;
  createSiteProject: CreateSiteProjectUseCase;
  getSiteProject: GetSiteProjectUseCase;
  listSiteProjects: ListSiteProjectsUseCase;
  listSiteRevisions: ListRevisionsUseCase;
  getSiteRevision: GetRevisionUseCase;
  listSitePages: ListPagesUseCase;
  getSitePage: GetPageUseCase;
  updateSitePageCopy: UpdatePageCopyUseCase;
  getSiteBuildJob: GetBuildJobUseCase;
  proposeSitePublish: ProposePublishUseCase;
  getSiteDeployTarget: GetDeployTargetUseCase;
  upsertSiteDeployTarget: UpsertDeployTargetUseCase;
  getSitePreviewUrl: GetPreviewUrlUseCase;
  resolveStorefrontSite: ResolveStorefrontSiteUseCase;
  getStorefrontCatalog: GetStorefrontCatalogUseCase;
  getStorefrontProduct: GetStorefrontProductUseCase;
  getStorefrontPage: GetStorefrontPageUseCase;
  createStorefrontCart: CreateCartUseCase;
  getStorefrontCart: GetCartUseCase;
  addStorefrontCartItem: AddCartItemUseCase;
  updateStorefrontCartItem: UpdateCartItemUseCase;
  removeStorefrontCartItem: RemoveCartItemUseCase;
  checkoutStorefrontCart: CheckoutCartUseCase;
}

export function wireStorefront(ctx: BootstrapContext, admin: AdminWiring): StorefrontWiring {
  const startSiteBuild = new StartBuildUseCase(
    ctx.siteRepository,
    ctx.storefrontCodegenCompiler,
    ctx.storefrontPreviewHost
  );
  const createSiteRevision = new CreateRevisionUseCase(ctx.siteRepository, ctx.storefrontCodegenCompiler);
  const healBrokenLiveSites = new HealBrokenLiveSitesUseCase(ctx.siteRepository, startSiteBuild);
  const applyBuildWallTrigger = new ApplyBuildWallTriggerUseCase(
    ctx.siteRepository,
    createSiteRevision,
    startSiteBuild,
    {
      upsertFinding: (tenantId, finding, cooldownMs) =>
        admin.proactiveSuggestionRepository.upsertFinding(tenantId, finding, cooldownMs),
    }
  );

  return {
    startSiteBuild,
    createSiteRevision,
    healBrokenLiveSites,
    applyBuildWallTrigger,
    createSiteProject: new CreateSiteProjectUseCase(ctx.siteRepository, ctx.storefrontCodegenCompiler),
    getSiteProject: new GetSiteProjectUseCase(ctx.siteRepository),
    listSiteProjects: new ListSiteProjectsUseCase(ctx.siteRepository),
    listSiteRevisions: new ListRevisionsUseCase(ctx.siteRepository),
    getSiteRevision: new GetRevisionUseCase(ctx.siteRepository),
    listSitePages: new ListPagesUseCase(ctx.siteRepository),
    getSitePage: new GetPageUseCase(ctx.siteRepository),
    updateSitePageCopy: new UpdatePageCopyUseCase(ctx.siteRepository, createSiteRevision),
    getSiteBuildJob: new GetBuildJobUseCase(ctx.siteRepository),
    proposeSitePublish: new ProposePublishUseCase(ctx.siteRepository, ctx.storefrontPublishApproval),
    getSiteDeployTarget: new GetDeployTargetUseCase(ctx.siteRepository),
    upsertSiteDeployTarget: new UpsertDeployTargetUseCase(ctx.siteRepository),
    getSitePreviewUrl: new GetPreviewUrlUseCase(ctx.siteRepository, ctx.storefrontPreviewHost),
    resolveStorefrontSite: new ResolveStorefrontSiteUseCase(ctx.siteRepository),
    getStorefrontCatalog: new GetStorefrontCatalogUseCase(ctx.siteRepository, ctx.storefrontCatalog),
    getStorefrontProduct: new GetStorefrontProductUseCase(ctx.siteRepository, ctx.storefrontCatalog),
    getStorefrontPage: new GetStorefrontPageUseCase(ctx.siteRepository),
    createStorefrontCart: new CreateCartUseCase(ctx.siteRepository, ctx.cartRepository),
    getStorefrontCart: new GetCartUseCase(ctx.siteRepository, ctx.cartRepository),
    addStorefrontCartItem: new AddCartItemUseCase(
      ctx.siteRepository,
      ctx.cartRepository,
      ctx.storefrontCatalog
    ),
    updateStorefrontCartItem: new UpdateCartItemUseCase(
      ctx.siteRepository,
      ctx.cartRepository,
      ctx.storefrontCatalog
    ),
    removeStorefrontCartItem: new RemoveCartItemUseCase(ctx.siteRepository, ctx.cartRepository),
    checkoutStorefrontCart: new CheckoutCartUseCase(
      ctx.siteRepository,
      ctx.cartRepository,
      ctx.storefrontCatalog,
      ctx.createOrderUseCase,
      ctx.paymentService,
      ctx.storefrontCheckoutIdempotency,
      new PrismaStorefrontCustomerAdapter(prisma)
    ),
  };
}
