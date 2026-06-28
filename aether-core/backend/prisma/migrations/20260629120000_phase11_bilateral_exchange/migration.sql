-- Phase 11: bilateral exchange + tenant toggle
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "brainBilateralExchangeEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "BilateralExchangeSchema" (
  "id" TEXT NOT NULL,
  "schemaKey" TEXT NOT NULL,
  "fields" JSONB NOT NULL DEFAULT '[]',
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BilateralExchangeSchema_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BilateralExchangeSchema_schemaKey_key" ON "BilateralExchangeSchema"("schemaKey");

CREATE TABLE IF NOT EXISTS "BilateralExchangeContract" (
  "id" TEXT NOT NULL,
  "providerTenantId" TEXT NOT NULL,
  "consumerTenantId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "schemaId" TEXT NOT NULL,
  "allowedFields" JSONB NOT NULL DEFAULT '[]',
  "ttlExpiresAt" TIMESTAMP(3),
  "consentProviderAt" TIMESTAMP(3),
  "consentConsumerAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BilateralExchangeContract_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BilateralExchangeContract_providerTenantId_status_idx" ON "BilateralExchangeContract"("providerTenantId", "status");
CREATE INDEX IF NOT EXISTS "BilateralExchangeContract_consumerTenantId_status_idx" ON "BilateralExchangeContract"("consumerTenantId", "status");

ALTER TABLE "BilateralExchangeContract" ADD CONSTRAINT "BilateralExchangeContract_schemaId_fkey"
  FOREIGN KEY ("schemaId") REFERENCES "BilateralExchangeSchema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BilateralExchangeAudit" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fieldHash" TEXT,
  "recordCount" INTEGER,
  "actorTenantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BilateralExchangeAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BilateralExchangeAudit_contractId_createdAt_idx" ON "BilateralExchangeAudit"("contractId", "createdAt");

ALTER TABLE "BilateralExchangeAudit" ADD CONSTRAINT "BilateralExchangeAudit_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "BilateralExchangeContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BilateralExchangePackage" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "packageHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BilateralExchangePackage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BilateralExchangePackage_contractId_createdAt_idx" ON "BilateralExchangePackage"("contractId", "createdAt");

ALTER TABLE "BilateralExchangePackage" ADD CONSTRAINT "BilateralExchangePackage_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "BilateralExchangeContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "BilateralExchangeSchema" ("id", "schemaKey", "fields", "description")
VALUES
  ('bex_schema_inventory', 'inventory_turnover_band', '["product_count_band","low_stock_ratio","turnover_index"]', 'Aggregated inventory turnover bands'),
  ('bex_schema_promo', 'promo_uplift_aggregate', '["promo_uplift_rate","sample_size"]', 'Promo uplift aggregate metrics'),
  ('bex_schema_supplier', 'supplier_category_mix', '["category_count","top_category_share"]', 'Supplier category mix aggregates')
ON CONFLICT ("schemaKey") DO NOTHING;
