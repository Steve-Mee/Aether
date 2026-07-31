-- Storefront Builder domain (Site*) + commerce schema gaps for dashboard/storefront.
-- Product images: MediaAsset + ProductMedia join (NOT inline Product.images Json).
-- Cart / CartItem / Promotion: schema-ready stubs for P13 (no API in P01).

-- AlterTable Product: SEO + category
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- CreateTable Category
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable MediaAsset
CREATE TABLE IF NOT EXISTS "MediaAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProductMedia
CREATE TABLE IF NOT EXISTS "ProductMedia" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable Cart
CREATE TABLE IF NOT EXISTS "Cart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable CartItem
CREATE TABLE IF NOT EXISTS "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable Promotion
CREATE TABLE IF NOT EXISTS "Promotion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'percent',
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable Shipment
CREATE TABLE IF NOT EXISTS "Shipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "shippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable Refund
CREATE TABLE IF NOT EXISTS "Refund" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable SiteProject
CREATE TABLE IF NOT EXISTS "SiteProject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "primaryDomain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "liveRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable SiteRevision
CREATE TABLE IF NOT EXISTS "SiteRevision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "briefJson" JSONB NOT NULL DEFAULT '{}',
    "planJson" JSONB NOT NULL DEFAULT '{}',
    "artifactsPath" TEXT,
    "qaReportJson" JSONB,
    "createdByAgent" TEXT,
    "parentRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable SitePage
CREATE TABLE IF NOT EXISTS "SitePage" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "seoJson" JSONB NOT NULL DEFAULT '{}',
    "treeJson" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SitePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable SiteAsset
CREATE TABLE IF NOT EXISTS "SiteAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SiteAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable BuildJob
CREATE TABLE IF NOT EXISTS "BuildJob" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "logs" TEXT,
    "previewUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuildJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable DeployTarget
CREATE TABLE IF NOT EXISTS "DeployTarget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "liveUrl" TEXT,
    "configJson" JSONB,
    "lastDeployedRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeployTarget_pkey" PRIMARY KEY ("id")
);

-- Indexes & unique constraints (tenant scoping)
CREATE UNIQUE INDEX IF NOT EXISTS "Category_tenantId_slug_key" ON "Category"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "Category_tenantId_parentId_idx" ON "Category"("tenantId", "parentId");

CREATE UNIQUE INDEX IF NOT EXISTS "MediaAsset_tenantId_key_key" ON "MediaAsset"("tenantId", "key");
CREATE INDEX IF NOT EXISTS "MediaAsset_tenantId_idx" ON "MediaAsset"("tenantId");

CREATE UNIQUE INDEX IF NOT EXISTS "ProductMedia_productId_mediaAssetId_key" ON "ProductMedia"("productId", "mediaAssetId");
CREATE INDEX IF NOT EXISTS "ProductMedia_productId_sortOrder_idx" ON "ProductMedia"("productId", "sortOrder");

CREATE INDEX IF NOT EXISTS "Product_tenantId_categoryId_idx" ON "Product"("tenantId", "categoryId");

CREATE INDEX IF NOT EXISTS "Cart_tenantId_status_idx" ON "Cart"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Cart_tenantId_customerId_idx" ON "Cart"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "CartItem_cartId_productId_idx" ON "CartItem"("cartId", "productId");

CREATE UNIQUE INDEX IF NOT EXISTS "Promotion_tenantId_code_key" ON "Promotion"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "Promotion_tenantId_status_idx" ON "Promotion"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "Shipment_tenantId_orderId_idx" ON "Shipment"("tenantId", "orderId");
CREATE INDEX IF NOT EXISTS "Shipment_tenantId_status_idx" ON "Shipment"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "Refund_tenantId_orderId_idx" ON "Refund"("tenantId", "orderId");
CREATE INDEX IF NOT EXISTS "Refund_tenantId_status_idx" ON "Refund"("tenantId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "SiteProject_liveRevisionId_key" ON "SiteProject"("liveRevisionId");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteProject_tenantId_slug_key" ON "SiteProject"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "SiteProject_tenantId_status_idx" ON "SiteProject"("tenantId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "SiteRevision_projectId_version_key" ON "SiteRevision"("projectId", "version");
CREATE INDEX IF NOT EXISTS "SiteRevision_projectId_createdAt_idx" ON "SiteRevision"("projectId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "SitePage_revisionId_path_key" ON "SitePage"("revisionId", "path");
CREATE INDEX IF NOT EXISTS "SitePage_revisionId_sortOrder_idx" ON "SitePage"("revisionId", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "SiteAsset_projectId_key_key" ON "SiteAsset"("projectId", "key");
CREATE INDEX IF NOT EXISTS "SiteAsset_projectId_idx" ON "SiteAsset"("projectId");

CREATE INDEX IF NOT EXISTS "BuildJob_revisionId_status_idx" ON "BuildJob"("revisionId", "status");
CREATE INDEX IF NOT EXISTS "BuildJob_status_createdAt_idx" ON "BuildJob"("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "DeployTarget_projectId_key" ON "DeployTarget"("projectId");

-- Foreign keys (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_mediaAssetId_fkey"
    FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey"
    FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SiteRevision" ADD CONSTRAINT "SiteRevision_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "SiteProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SiteRevision" ADD CONSTRAINT "SiteRevision_parentRevisionId_fkey"
    FOREIGN KEY ("parentRevisionId") REFERENCES "SiteRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SiteProject" ADD CONSTRAINT "SiteProject_liveRevisionId_fkey"
    FOREIGN KEY ("liveRevisionId") REFERENCES "SiteRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SitePage" ADD CONSTRAINT "SitePage_revisionId_fkey"
    FOREIGN KEY ("revisionId") REFERENCES "SiteRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SiteAsset" ADD CONSTRAINT "SiteAsset_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "SiteProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BuildJob" ADD CONSTRAINT "BuildJob_revisionId_fkey"
    FOREIGN KEY ("revisionId") REFERENCES "SiteRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DeployTarget" ADD CONSTRAINT "DeployTarget_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "SiteProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DeployTarget" ADD CONSTRAINT "DeployTarget_lastDeployedRevisionId_fkey"
    FOREIGN KEY ("lastDeployedRevisionId") REFERENCES "SiteRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
