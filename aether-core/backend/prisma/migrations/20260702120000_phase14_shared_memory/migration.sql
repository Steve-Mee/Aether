-- Phase 14: TTL on run memory + merchant shared memory
ALTER TABLE "RunWorkingMemory" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "RunWorkingMemory_expiresAt_idx" ON "RunWorkingMemory"("expiresAt");

CREATE TABLE IF NOT EXISTS "MerchantSharedMemory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedByAgentKey" TEXT NOT NULL,
    "promotedFromRunId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantSharedMemory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MerchantSharedMemory_tenantId_namespace_key_key"
  ON "MerchantSharedMemory"("tenantId", "namespace", "key");
CREATE INDEX IF NOT EXISTS "MerchantSharedMemory_tenantId_idx" ON "MerchantSharedMemory"("tenantId");
CREATE INDEX IF NOT EXISTS "MerchantSharedMemory_expiresAt_idx" ON "MerchantSharedMemory"("expiresAt");
