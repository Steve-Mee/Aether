-- Channel Sync: external webshop connections (Shopify, WooCommerce)

CREATE TABLE IF NOT EXISTS "ChannelConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "storeUrl" TEXT NOT NULL,
    "credentialsEnc" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "syncProducts" BOOLEAN NOT NULL DEFAULT true,
    "syncOrders" BOOLEAN NOT NULL DEFAULT true,
    "syncInventory" BOOLEAN NOT NULL DEFAULT false,
    "syncInterval" INTEGER NOT NULL DEFAULT 3600,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChannelSyncLog" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChannelConnection_tenantId_provider_storeUrl_key"
  ON "ChannelConnection"("tenantId", "provider", "storeUrl");

CREATE INDEX IF NOT EXISTS "ChannelConnection_tenantId_enabled_idx"
  ON "ChannelConnection"("tenantId", "enabled");

CREATE INDEX IF NOT EXISTS "ChannelSyncLog_connectionId_syncedAt_idx"
  ON "ChannelSyncLog"("connectionId", "syncedAt");

CREATE INDEX IF NOT EXISTS "ChannelSyncLog_tenantId_syncedAt_idx"
  ON "ChannelSyncLog"("tenantId", "syncedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChannelSyncLog_connectionId_fkey'
  ) THEN
    ALTER TABLE "ChannelSyncLog"
      ADD CONSTRAINT "ChannelSyncLog_connectionId_fkey"
      FOREIGN KEY ("connectionId") REFERENCES "ChannelConnection"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ChannelExternalRef" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "nativeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelExternalRef_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChannelExternalRef_connectionId_entityType_externalId_key"
  ON "ChannelExternalRef"("connectionId", "entityType", "externalId");

CREATE INDEX IF NOT EXISTS "ChannelExternalRef_tenantId_entityType_nativeId_idx"
  ON "ChannelExternalRef"("tenantId", "entityType", "nativeId");
